import { AtlasConfigError } from './errors.js';
import { apply, multiply, rotate, scale, translate } from './matrix.js';
import { rectFromPoints } from './rect.js';
import type { Matrix, Point, Rect, Size } from './shapes.js';

export type CameraState = Readonly<{
  /** World point at the viewport centre. */
  x: number;
  y: number;
  /** Screen pixels per world unit. */
  zoom: number;
  /** Radians in (-π, π]; positive is clockwise on screen. */
  rotation: number;
}>;

export type CameraOptions = Readonly<{
  initial?: Partial<CameraState>;
  minZoom?: number;
  maxZoom?: number;
  /** Viewport size in CSS px. Default 0×0, where the centre is the origin. */
  viewport?: Size;
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
}>;

export type Camera = Readonly<{
  readonly state: CameraState;
  /** Viewport size in CSS px; the world point at its centre is `state.x/y`. */
  readonly viewport: Size;
  /** world → screen. */
  readonly matrix: Matrix;
  /** screen → world. Zoom is clamped above zero, so this always exists. */
  readonly inverse: Matrix;
  toScreen(point: Point): Point;
  toWorld(point: Point): Point;
  /** Jump to `target` immediately, cancelling any animation. */
  set(target: Partial<CameraState>): void;
  /** Change the viewport size, keeping the world point at its centre fixed. */
  resize(size: Size): void;
  panBy(dx: number, dy: number): void;
  /** Zoom keeping the world point under `screenPoint` fixed. `factor` multiplies current zoom. */
  zoomAt(screenPoint: Point, factor: number): void;
  /** Rotate keeping the world point under `screenPoint` fixed. `delta` radians. */
  rotateAt(screenPoint: Point, delta: number): void;
  /** Fit `bounds` into the current viewport with inner `padding`. */
  fitBounds(bounds: Rect, options?: Readonly<{ padding?: number }>): void;
  /** Axis-aligned world bounds of the visible viewport, honouring rotation. */
  readonly visibleRect: Rect;
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

/** Normalize an angle to (-π, π]. */
function normalizeAngle(angle: number): number {
  const wrapped = (angle + Math.PI) % (2 * Math.PI);
  return ((wrapped + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

/** Shortest signed path from `from` to `to`, in (-π, π]. */
function shortestAngle(from: number, to: number): number {
  return normalizeAngle(to - from);
}

/** World-space offset that a screen-space offset corresponds to at `zoom`/`rotation`. */
function screenDeltaToWorld(delta: Point, zoom: number, rotation: number): Point {
  return apply(multiply(rotate(-rotation), scale(1 / zoom)), delta);
}

/**
 * world → screen: translate(viewport centre) · scale(zoom) · rotate(rotation) · translate(-state).
 * With the state point at the viewport centre, saved states no longer depend
 * on the screen size.
 */
function matrixOf(s: CameraState, viewport: Size): Matrix {
  const rotated = multiply(scale(s.zoom), rotate(s.rotation));
  const m = multiply(rotated, translate(-s.x, -s.y));
  return multiply(translate(viewport.width / 2, viewport.height / 2), m);
}

/**
 * screen → world in closed form: translate(state) · rotate(-r) · scale(1/z) · translate(-centre).
 * Zoom is clamped above zero, so the camera matrix is always invertible.
 */
function inverseOf(s: CameraState, viewport: Size): Matrix {
  const m = multiply(rotate(-s.rotation), scale(1 / s.zoom));
  const t = screenDeltaToWorld({ x: viewport.width / 2, y: viewport.height / 2 }, s.zoom, s.rotation);
  return multiply(translate(s.x - t.x, s.y - t.y), m);
}

export function createCamera(options: CameraOptions = {}): Camera {
  const minZoom = options.minZoom ?? 0.01;
  const maxZoom = options.maxZoom ?? 1000;
  if (!(minZoom > 0 && minZoom <= maxZoom)) {
    throw new AtlasConfigError(`Zoom clamps must satisfy 0 < minZoom <= maxZoom, received ${minZoom} and ${maxZoom}`);
  }
  const scheduler = options.scheduler ?? DEFAULT_SCHEDULER;
  const initial = options.initial ?? {};
  let viewport: Size = options.viewport ?? { height: 0, width: 0 };
  let state: CameraState = {
    rotation: normalizeAngle(initial.rotation ?? 0),
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

  // Derived transforms are recomputed at most once per state or viewport change.
  let cachedMatrix: Matrix | null = null;
  let cachedInverse: Matrix | null = null;

  const matrix = (): Matrix => {
    cachedMatrix ??= matrixOf(state, viewport);
    return cachedMatrix;
  };
  const inverse = (): Matrix => {
    cachedInverse ??= inverseOf(state, viewport);
    return cachedInverse;
  };

  const invalidate = (): void => {
    cachedMatrix = null;
    cachedInverse = null;
  };

  /** Screen point measured from the viewport centre, where the state point sits. */
  const relativeToCentre = (screenPoint: Point): Point => ({
    x: screenPoint.x - viewport.width / 2,
    y: screenPoint.y - viewport.height / 2,
  });

  const emit = (): void => {
    for (const listener of [...listeners]) listener(state);
  };

  const set = (next: Partial<CameraState>): void => {
    if (disposed) return;
    const candidate: CameraState = {
      rotation: normalizeAngle(next.rotation ?? state.rotation),
      x: next.x ?? state.x,
      y: next.y ?? state.y,
      zoom: Math.min(maxZoom, Math.max(minZoom, next.zoom ?? state.zoom)),
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
    invalidate();
    emit();
  };

  /** Cancel any running animation; direct manipulation always wins. */
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
    const signal = animateOptions.signal;
    if (signal?.aborted) return;
    if (duration <= 0) {
      set(target);
      return;
    }
    const from = state;
    const to: CameraState = {
      rotation: from.rotation + shortestAngle(from.rotation, target.rotation ?? state.rotation),
      x: target.x ?? state.x,
      y: target.y ?? state.y,
      zoom: Math.min(maxZoom, Math.max(minZoom, target.zoom ?? state.zoom)),
    };
    const start = scheduler.now();
    // Log-space zoom interpolation keeps multiplicative zoom visually linear.
    const logFrom = Math.log(from.zoom);
    const logTo = Math.log(to.zoom);
    const frame = { cleanup: () => {}, frame: 0 };
    animation = frame;
    const abort = (): void => {
      if (animation !== frame) return;
      stop();
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
        rotation: from.rotation + (to.rotation - from.rotation) * e,
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        zoom: Math.exp(logFrom + (logTo - logFrom) * e),
      });
      if (t >= 1) {
        animation = null;
        frame.cleanup();
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
    fitBounds(bounds, fitOptions = {}) {
      if (disposed) return;
      stop();
      const padding = fitOptions.padding ?? 0;
      const availableWidth = Math.max(1, viewport.width - padding * 2);
      const availableHeight = Math.max(1, viewport.height - padding * 2);
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
      // The state point is the world point at the viewport centre, so fitting
      // the bounds centre on screen means moving the state to it directly.
      set({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, zoom });
    },
    get inverse() {
      return inverse();
    },
    get matrix() {
      return matrix();
    },
    panBy(dx, dy) {
      if (disposed) return;
      stop();
      // Screen-space pan: move the world centre opposite to the drag.
      const offset = screenDeltaToWorld({ x: dx, y: dy }, state.zoom, state.rotation);
      set({ x: state.x - offset.x, y: state.y - offset.y });
    },
    resize(size) {
      if (disposed) return;
      if (size.width === viewport.width && size.height === viewport.height) return;
      viewport = { height: size.height, width: size.width };
      // The state point is the world centre, so it stays fixed by definition;
      // only the derived transforms change.
      invalidate();
      emit();
    },
    rotateAt(screenPoint, delta) {
      if (disposed) return;
      stop();
      const world = apply(inverse(), screenPoint);
      // Anchor math must use the new rotation, so compute before set() normalizes it.
      const rotation = state.rotation + delta;
      const offset = screenDeltaToWorld(relativeToCentre(screenPoint), state.zoom, rotation);
      set({ rotation, x: world.x - offset.x, y: world.y - offset.y });
    },
    set(target) {
      stop();
      set(target);
    },
    [Symbol.dispose]: dispose,
    get state() {
      return state;
    },
    stop,
    subscribe(listener, subscribeOptions) {
      if (disposed || subscribeOptions?.signal?.aborted) return () => {};
      listeners.add(listener);
      subscribeOptions?.signal?.addEventListener('abort', () => listeners.delete(listener), { once: true });
      return () => listeners.delete(listener);
    },
    toScreen(point) {
      return apply(matrix(), point);
    },
    toWorld(point) {
      return apply(inverse(), point);
    },
    get viewport() {
      return viewport;
    },
    get visibleRect() {
      const to = inverse();
      const corners = [
        apply(to, { x: 0, y: 0 }),
        apply(to, { x: viewport.width, y: 0 }),
        apply(to, { x: 0, y: viewport.height }),
        apply(to, { x: viewport.width, y: viewport.height }),
      ] as const;
      // A finite viewport always produces a rect.
      return rectFromPoints(corners);
    },
    zoomAt(screenPoint, factor) {
      if (!Number.isFinite(factor) || factor <= 0) {
        throw new AtlasConfigError(`zoomAt factor must be a positive finite number, received ${factor}`);
      }
      if (disposed) return;
      stop();
      const world = apply(inverse(), screenPoint);
      const zoom = Math.min(maxZoom, Math.max(minZoom, state.zoom * factor));
      // Anchor math must use the new zoom, so compute before set().
      const offset = screenDeltaToWorld(relativeToCentre(screenPoint), zoom, state.rotation);
      set({ x: world.x - offset.x, y: world.y - offset.y, zoom });
    },
  };
}
