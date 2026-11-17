import { AtlasConfigError } from './errors.js';
import { boundsOf } from './geometry.js';
import { apply, IDENTITY, invert, multiply, rotate, scale, translate } from './matrix.js';
import type { Matrix, Point, Rect } from './shapes.js';

export type CameraState = Readonly<{
  /** World point that maps to the viewport origin (screen 0,0). */
  x: number;
  y: number;
  /** Screen pixels per world unit. */
  zoom: number;
  /** Radians; positive is clockwise on screen. */
  rotation: number;
}>;

export type CameraOptions = Readonly<{
  initial?: Partial<CameraState>;
  minZoom?: number;
  maxZoom?: number;
  scheduler?: FrameScheduler;
}>;

export type FrameScheduler = Readonly<{
  requestFrame: (callback: (time: number) => void) => number;
  cancelFrame: (handle: number) => void;
  now: () => number;
}>;

export type AnimationOptions = Readonly<{
  duration?: number;
  easing?: (t: number) => number;
  signal?: AbortSignal;
  onDone?: (completed: boolean) => void;
}>;

export type Camera = Readonly<{
  readonly state: CameraState;
  /** world → screen. */
  readonly matrix: Matrix;
  /** screen → world. Null only for degenerate state (zoom 0 is prevented by clamps). */
  readonly inverse: Matrix | null;
  toScreen(point: Point): Point;
  toWorld(point: Point): Point;
  panBy(dx: number, dy: number): void;
  /** Zoom keeping the world point under `screenPoint` fixed. `factor` multiplies current zoom. */
  zoomAt(screenPoint: Point, factor: number): void;
  /** Rotate keeping the world point under `screenPoint` fixed. `delta` radians. */
  rotateAt(screenPoint: Point, delta: number): void;
  /** Fit `bounds` into a viewport of `size` (CSS px) with inner `padding`. */
  fitBounds(bounds: Rect, options: Readonly<{ size: Point; padding?: number }>): void;
  visibleRect(size: Point): Rect;
  /** Animate to `target`; concurrent calls replace the running animation. */
  animateTo(target: Partial<CameraState>, options?: AnimationOptions): void;
  stop(): void;
  subscribe(listener: (state: CameraState) => void, options?: Readonly<{ signal?: AbortSignal }>): () => void;
  dispose(): void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose]: () => void;
}>;

const DEFAULT_SCHEDULER: FrameScheduler = {
  cancelFrame: (handle) => cancelAnimationFrame(handle),
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
};

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new AtlasConfigError(`${name} must be a finite number, received ${value}`);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Wrap an angle difference to (-π, π] for shortest-path rotation animation. */
function shortestAngle(delta: number): number {
  const wrapped = (delta + Math.PI) % (2 * Math.PI);
  return ((wrapped + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

/** Normalize an angle to (-π, π]. */
function normalizeAngle(angle: number): number {
  const wrapped = (angle + Math.PI) % (2 * Math.PI);
  return ((wrapped + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

export function createCamera(options: CameraOptions = {}): Camera {
  const minZoom = options.minZoom ?? 0.01;
  const maxZoom = options.maxZoom ?? 1000;
  if (!(minZoom > 0 && minZoom <= maxZoom)) {
    throw new AtlasConfigError(`Zoom clamps must satisfy 0 < minZoom <= maxZoom, received ${minZoom} and ${maxZoom}`);
  }
  const scheduler = options.scheduler ?? DEFAULT_SCHEDULER;
  const initial = options.initial ?? {};
  let state: CameraState = {
    rotation: initial.rotation ?? 0,
    x: initial.x ?? 0,
    y: initial.y ?? 0,
    zoom: Math.min(maxZoom, Math.max(minZoom, initial.zoom ?? 1)),
  };
  for (const [name, value] of [
    ['camera.x', state.x],
    ['camera.y', state.y],
    ['camera.rotation', state.rotation],
  ] as const) {
    assertFinite(name, value);
  }

  const controller = new AbortController();
  let disposed = false;
  let animation: { cleanup: () => void; frame: number } | null = null;
  const listeners = new Set<(state: CameraState) => void>();

  const emit = (): void => {
    for (const listener of [...listeners]) listener(state);
  };

  const set = (next: Partial<CameraState>): void => {
    const zoom = Math.min(maxZoom, Math.max(minZoom, next.zoom ?? state.zoom));
    const candidate: CameraState = {
      rotation: next.rotation ?? state.rotation,
      x: next.x ?? state.x,
      y: next.y ?? state.y,
      zoom,
    };
    if (
      candidate.x === state.x &&
      candidate.y === state.y &&
      candidate.zoom === state.zoom &&
      candidate.rotation === state.rotation
    ) {
      return;
    }
    state = candidate;
    emit();
  };

  const matrixOf = (s: CameraState): Matrix =>
    multiply(multiply(scale(s.zoom), rotate(s.rotation)), translate(-s.x, -s.y));

  const matrix = (): Matrix => matrixOf(state);

  const stop = (): void => {
    if (!animation) return;
    scheduler.cancelFrame(animation.frame);
    animation.cleanup();
    animation = null;
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    stop();
    listeners.clear();
    controller.abort();
  };

  const animateTo: Camera['animateTo'] = (target, animateOptions = {}) => {
    stop();
    if (disposed) return;
    const duration = animateOptions.duration ?? 250;
    const easing = animateOptions.easing ?? easeInOut;
    const onDone = animateOptions.onDone;
    const signal = animateOptions.signal;
    if (signal?.aborted) {
      onDone?.(false);
      return;
    }
    if (duration <= 0) {
      set(target);
      onDone?.(true);
      return;
    }
    const from = state;
    const toZoom = Math.min(maxZoom, Math.max(minZoom, target.zoom ?? state.zoom));
    const to: CameraState = {
      rotation: from.rotation + shortestAngle((target.rotation ?? state.rotation) - from.rotation),
      x: target.x ?? state.x,
      y: target.y ?? state.y,
      zoom: toZoom,
    };
    const start = scheduler.now();
    // Log-space zoom interpolation keeps multiplicative zoom visually linear.
    const logFrom = Math.log(from.zoom);
    const logTo = Math.log(toZoom);
    const frame = { cleanup: () => {}, frame: 0 };
    animation = frame;
    const abort = (): void => {
      if (animation !== frame) return;
      stop();
      onDone?.(false);
    };
    if (signal) {
      signal.addEventListener('abort', abort, { once: true });
      frame.cleanup = () => signal.removeEventListener('abort', abort);
    }
    const step = (time: number): void => {
      if (animation !== frame) return;
      const t = Math.min(1, (time - start) / duration);
      const e = easing(t);
      set({
        rotation: t >= 1 ? normalizeAngle(to.rotation) : from.rotation + (to.rotation - from.rotation) * e,
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        zoom: Math.exp(logFrom + (logTo - logFrom) * e),
      });
      if (t >= 1) {
        animation = null;
        frame.cleanup();
        onDone?.(true);
        return;
      }
      frame.frame = scheduler.requestFrame(step);
    };
    frame.frame = scheduler.requestFrame(step);
  };

  return {
    animateTo,
    get disposalSignal() {
      return controller.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    fitBounds(bounds, fitOptions) {
      const padding = fitOptions.padding ?? 0;
      const availableWidth = Math.max(1, fitOptions.size.x - padding * 2);
      const availableHeight = Math.max(1, fitOptions.size.y - padding * 2);
      const zoom = Math.min(
        maxZoom,
        Math.max(
          minZoom,
          Math.min(
            bounds.width === 0 ? maxZoom : availableWidth / bounds.width,
            bounds.height === 0 ? maxZoom : availableHeight / bounds.height,
          ),
        ),
      );
      const center: Point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      // Want center → viewport center. c = center - R⁻¹·viewportCenter / zoom.
      const cos = Math.cos(state.rotation);
      const sin = Math.sin(state.rotation);
      const vx = fitOptions.size.x / 2;
      const vy = fitOptions.size.y / 2;
      const ux = (vx * cos + vy * sin) / zoom;
      const uy = (-vx * sin + vy * cos) / zoom;
      set({ x: center.x - ux, y: center.y - uy, zoom });
    },
    get inverse() {
      return invert(matrix());
    },
    get matrix() {
      return matrix();
    },
    panBy(dx, dy) {
      // Screen-space pan: move the world anchor opposite to the drag.
      const cos = Math.cos(state.rotation);
      const sin = Math.sin(state.rotation);
      const wx = (dx * cos + dy * sin) / state.zoom;
      const wy = (-dx * sin + dy * cos) / state.zoom;
      set({ x: state.x - wx, y: state.y - wy });
    },
    rotateAt(screenPoint, delta) {
      const rotation = state.rotation + delta;
      const world = apply(invert(matrix()) ?? IDENTITY, screenPoint);
      // Keep `world` under `screenPoint`: c' = world - R(θ')⁻¹·screenPoint / zoom.
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const ux = (screenPoint.x * cos + screenPoint.y * sin) / state.zoom;
      const uy = (-screenPoint.x * sin + screenPoint.y * cos) / state.zoom;
      set({ rotation, x: world.x - ux, y: world.y - uy });
    },
    [Symbol.dispose]: dispose,
    get state() {
      return state;
    },
    stop,
    subscribe(listener, subscribeOptions) {
      listeners.add(listener);
      subscribeOptions?.signal?.addEventListener('abort', () => listeners.delete(listener), { once: true });
      return () => listeners.delete(listener);
    },
    toScreen(point) {
      return apply(matrix(), point);
    },
    toWorld(point) {
      return apply(invert(matrix()) ?? IDENTITY, point);
    },
    visibleRect(size) {
      const corners = [
        apply(invert(matrix()) ?? IDENTITY, { x: 0, y: 0 }),
        apply(invert(matrix()) ?? IDENTITY, { x: size.x, y: 0 }),
        apply(invert(matrix()) ?? IDENTITY, { x: 0, y: size.y }),
        apply(invert(matrix()) ?? IDENTITY, { x: size.x, y: size.y }),
      ];
      const bounds = boundsOf(corners);
      if (!bounds) throw new AtlasConfigError('Viewport size must produce a visible rect');
      return bounds;
    },
    zoomAt(screenPoint, factor) {
      if (!Number.isFinite(factor) || factor <= 0) {
        throw new AtlasConfigError(`zoomAt factor must be a positive finite number, received ${factor}`);
      }
      const zoom = Math.min(maxZoom, Math.max(minZoom, state.zoom * factor));
      const world = apply(invert(matrix()) ?? IDENTITY, screenPoint);
      const cos = Math.cos(state.rotation);
      const sin = Math.sin(state.rotation);
      const ux = (screenPoint.x * cos + screenPoint.y * sin) / zoom;
      const uy = (-screenPoint.x * sin + screenPoint.y * cos) / zoom;
      set({ x: world.x - ux, y: world.y - uy, zoom });
    },
  };
}
