import type { Matrix, Rect } from './_shapes.js';
import { invertMatrix } from './_shapes.js';
import { StageConfigError, StageUnsupportedError } from './errors.js';

/** A backing surface a layer paints into. `OffscreenCanvas` on workers. */
export type StageSurface = {
  width: number;
  height: number;
  getContext: (type: '2d', attributes?: CanvasRenderingContext2DSettings) => unknown;
};

/** Factory for layer backing surfaces; injectable for tests and workers. */
export type CreateSurface = (width: number, height: number) => StageSurface;

export type PaintContext = Readonly<{
  /** World→screen matrix (DPR already applied to the context transform). */
  matrix: Matrix;
  /** Visible world-space rect for culling. */
  visibleRect: Rect;
  /** Device pixel ratio in effect. */
  dpr: number;
  /** Frame timestamp from the scheduler. */
  time: number;
}>;

export type StageLayerOptions = Readonly<{
  id: string;
  paint: (ctx: CanvasRenderingContext2D, frame: PaintContext) => void;
}>;

export type StageOptions = Readonly<{
  dpr?: number;
  layers?: readonly StageLayerOptions[];
  scheduler?: FrameScheduler;
  createSurface?: CreateSurface;
  /** Background color cleared under the layers; defaults to transparent. */
  background?: string | null;
}>;

export type FrameScheduler = Readonly<{
  requestFrame: (callback: (time: number) => void) => number;
  cancelFrame: (handle: number) => void;
}>;

export type StageFrameInfo = Readonly<{
  /** Layer ids that were repainted for this frame. */
  repainted: readonly string[];
  time: number;
}>;

export type StageSpriteSheet = Readonly<{
  /** Frame cell size in source-image pixels. */
  frameWidth: number;
  frameHeight: number;
  /** Frames per row in the sheet. */
  columns: number;
  frames: number;
}>;

export type Stage = {
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  /** Current world→screen matrix (CSS pixels, without DPR). */
  readonly matrix: Matrix;
  readonly visibleRect: Rect;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  readonly layerIds: readonly string[];
  /** Resize the CSS size and DPR; reallocates backing surfaces and invalidates all. */
  resize: (size: { width: number; height: number }, dpr?: number) => void;
  /** Set the world→screen matrix; invalidates all layers. */
  setTransform: (matrix: Matrix) => void;
  addLayer: (options: StageLayerOptions) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, index: number) => void;
  /** Mark one layer dirty (omit to mark all); schedules a frame. */
  invalidate: (layerId?: string) => void;
  /** Run any pending repaint/composite synchronously. */
  render: (time?: number) => StageFrameInfo;
  /** Sprite-sheet helper: draws one frame of `sheet` scaled to fit `rect`. */
  drawSpriteFrame: (
    ctx: CanvasRenderingContext2D,
    image: CanvasImageSource,
    sheet: StageSpriteSheet,
    frame: number,
    rect: Rect,
  ) => void;
  toBlob: (options?: { type?: string; quality?: number }) => Promise<Blob>;
  [Symbol.dispose]: () => void;
  dispose: () => void;
};

const DEFAULT_SCHEDULER: FrameScheduler = {
  // Workers may lack requestAnimationFrame; fall back to a timer there.
  cancelFrame: (handle) => {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
    else clearTimeout(handle);
  },
  requestFrame: (callback) =>
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(callback)
      : (setTimeout(() => callback(Date.now()), 16) as unknown as number),
};

function defaultCreateSurface(width: number, height: number): StageSurface {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height) as unknown as StageSurface;
  }
  if (typeof document !== 'undefined') {
    const el = document.createElement('canvas');
    el.width = width;
    el.height = height;
    return el;
  }
  throw new StageUnsupportedError('No canvas surface factory is available in this environment.');
}

function assertFiniteMatrix(matrix: Matrix): void {
  for (const value of matrix) {
    if (!Number.isFinite(value)) {
      throw new StageConfigError(`Stage matrix must contain only finite numbers, got ${value}.`);
    }
  }
}

type LayerRecord = {
  id: string;
  paint: (ctx: CanvasRenderingContext2D, frame: PaintContext) => void;
  surface: StageSurface | null;
  ctx: CanvasRenderingContext2D | null;
  dirty: boolean;
};

/**
 * Creates a retained-mode 2D stage: ordered layers, each with a cached
 * backing surface, repainted only when dirty and composited to the canvas
 * every scheduled frame. Paint callbacks draw in world units; the stage
 * applies the world→screen matrix and DPR to the context transform.
 */
export function createStage(
  canvas: HTMLCanvasElement,
  options: StageOptions & Readonly<{ width: number; height: number }>,
): Stage {
  const { width: initialWidth, height: initialHeight } = options;
  if (!Number.isFinite(initialWidth) || initialWidth <= 0 || !Number.isFinite(initialHeight) || initialHeight <= 0) {
    throw new StageConfigError(`Stage size must be positive finite numbers, got ${initialWidth}x${initialHeight}.`);
  }
  const dpr0 = options.dpr ?? 1;
  if (!Number.isFinite(dpr0) || dpr0 <= 0) {
    throw new StageConfigError(`Stage dpr must be a positive finite number, got ${dpr0}.`);
  }
  const scheduler = options.scheduler ?? DEFAULT_SCHEDULER;
  const createSurface = options.createSurface ?? defaultCreateSurface;
  const background = options.background ?? null;

  const controller = new AbortController();
  let disposed = false;
  let width = initialWidth;
  let height = initialHeight;
  let dpr = dpr0;
  let matrix: Matrix = [1, 0, 0, 1, 0, 0];
  let frameHandle: number | null = null;
  let pending = false;

  const layers: LayerRecord[] = [];

  const createRecord = (opts: StageLayerOptions): LayerRecord => {
    if (layers.some((layer) => layer.id === opts.id)) {
      throw new StageConfigError(`Stage layer id "${opts.id}" is already registered.`);
    }
    return { ctx: null, dirty: true, id: opts.id, paint: opts.paint, surface: null };
  };

  const disposeSurface = (layer: LayerRecord): void => {
    if (layer.surface) {
      // Release backing-store memory for both canvas flavours.
      layer.surface.width = 0;
      layer.surface.height = 0;
    }
    layer.surface = null;
    layer.ctx = null;
  };

  const ensureSurface = (layer: LayerRecord): CanvasRenderingContext2D => {
    const pw = Math.max(1, Math.round(width * dpr));
    const ph = Math.max(1, Math.round(height * dpr));
    if (!layer.surface || layer.surface.width !== pw || layer.surface.height !== ph) {
      disposeSurface(layer);
      layer.surface = createSurface(pw, ph);
      const ctx = layer.surface.getContext('2d', { alpha: true });
      if (ctx == null) {
        throw new StageUnsupportedError(`Layer surface for "${layer.id}" has no 2D context.`);
      }
      layer.ctx = ctx as CanvasRenderingContext2D;
      layer.dirty = true;
    }
    return layer.ctx as CanvasRenderingContext2D;
  };

  const visibleRect = (): Rect => {
    const inv = invertMatrix(matrix);
    if (!inv) return { height, width, x: 0, y: 0 };
    const corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: height },
      { x: width, y: height },
    ].map(({ x, y }) => ({
      x: inv[0] * x + inv[2] * y + inv[4],
      y: inv[1] * x + inv[3] * y + inv[5],
    }));
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const p of corners) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { height: maxY - minY, width: maxX - minX, x: minX, y: minY };
  };

  const applyWorldTransform = (ctx: CanvasRenderingContext2D): void => {
    const [a, b, c, d, e, f] = matrix;
    ctx.setTransform(dpr * a, dpr * b, dpr * c, dpr * d, dpr * e, dpr * f);
  };

  const renderFrame = (time: number): StageFrameInfo => {
    pending = false;
    frameHandle = null;
    if (disposed) return { repainted: [], time };

    const rect = visibleRect();
    const frame: PaintContext = { dpr, matrix, time, visibleRect: rect };
    const repainted: string[] = [];

    for (const layer of layers) {
      if (layer.dirty) {
        const ctx = ensureSurface(layer);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, layer.surface?.width ?? 0, layer.surface?.height ?? 0);
        applyWorldTransform(ctx);
        layer.paint(ctx, frame);
        layer.dirty = false;
        repainted.push(layer.id);
      }
    }

    const screen = canvas.getContext('2d');
    if (screen) {
      const pw = Math.max(1, Math.round(width * dpr));
      const ph = Math.max(1, Math.round(height * dpr));
      const cw = Math.max(1, Math.round(canvas.width));
      const ch = Math.max(1, Math.round(canvas.height));
      screen.setTransform(1, 0, 0, 1, 0, 0);
      screen.clearRect(0, 0, cw, ch);
      if (background != null) {
        screen.fillStyle = background;
        screen.fillRect(0, 0, cw, ch);
      }
      for (const layer of layers) {
        if (layer.surface) {
          // Composite the cached layer at native pixels; canvas is sized pw x ph.
          screen.drawImage(layer.surface as unknown as CanvasImageSource, 0, 0, pw, ph);
        }
      }
    }
    return { repainted, time };
  };

  const schedule = (): void => {
    if (disposed || pending) return;
    pending = true;
    frameHandle = scheduler.requestFrame((time) => {
      if (pending) renderFrame(time);
    });
  };

  const invalidateAll = (): void => {
    for (const layer of layers) layer.dirty = true;
  };

  const cancelFrame = (): void => {
    if (frameHandle != null) {
      scheduler.cancelFrame(frameHandle);
      frameHandle = null;
    }
    pending = false;
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    cancelFrame();
    for (const layer of layers) disposeSurface(layer);
    layers.length = 0;
    controller.abort();
  };

  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));

  for (const layerOptions of options.layers ?? []) {
    layers.push(createRecord(layerOptions));
  }

  const stage: Stage = {
    addLayer(layerOptions) {
      if (disposed) return;
      layers.push(createRecord(layerOptions));
      schedule();
    },
    get canvas() {
      return canvas;
    },
    get disposalSignal() {
      return controller.signal;
    },
    get disposed() {
      return disposed;
    },
    [Symbol.dispose]: dispose,
    dispose,
    get dpr() {
      return dpr;
    },
    drawSpriteFrame(ctx, image, sheet, frame, rect) {
      if (!Number.isInteger(frame) || frame < 0 || frame >= sheet.frames) {
        throw new StageConfigError(`Sprite frame index must be an integer in [0, ${sheet.frames}), got ${frame}.`);
      }
      const col = frame % sheet.columns;
      const row = Math.floor(frame / sheet.columns);
      ctx.drawImage(
        image,
        col * sheet.frameWidth,
        row * sheet.frameHeight,
        sheet.frameWidth,
        sheet.frameHeight,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
      );
    },
    get height() {
      return height;
    },
    invalidate(layerId) {
      if (disposed) return;
      if (layerId == null) {
        invalidateAll();
      } else {
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) throw new StageConfigError(`Unknown stage layer "${layerId}".`);
        layer.dirty = true;
      }
      schedule();
    },
    get layerIds() {
      return layers.map((l) => l.id);
    },
    get matrix() {
      return matrix;
    },
    moveLayer(id, index) {
      if (disposed) return;
      const from = layers.findIndex((l) => l.id === id);
      if (from === -1) throw new StageConfigError(`Unknown stage layer "${id}".`);
      if (!Number.isInteger(index) || index < 0 || index >= layers.length) {
        throw new StageConfigError(`Layer index must be an integer in [0, ${layers.length}), got ${index}.`);
      }
      const [layer] = layers.splice(from, 1);
      layers.splice(index, 0, layer as LayerRecord);
      schedule();
    },
    removeLayer(id) {
      if (disposed) return;
      const index = layers.findIndex((l) => l.id === id);
      if (index === -1) throw new StageConfigError(`Unknown stage layer "${id}".`);
      const [layer] = layers.splice(index, 1);
      if (layer) disposeSurface(layer);
      schedule();
    },
    render(time) {
      if (disposed) return { repainted: [], time: time ?? 0 };
      cancelFrame();
      return renderFrame(time ?? 0);
    },
    resize(size, nextDpr) {
      if (disposed) return;
      if (!Number.isFinite(size.width) || size.width <= 0 || !Number.isFinite(size.height) || size.height <= 0) {
        throw new StageConfigError(`Stage size must be positive finite numbers, got ${size.width}x${size.height}.`);
      }
      const resolvedDpr = nextDpr ?? dpr;
      if (!Number.isFinite(resolvedDpr) || resolvedDpr <= 0) {
        throw new StageConfigError(`Stage dpr must be a positive finite number, got ${resolvedDpr}.`);
      }
      width = size.width;
      height = size.height;
      dpr = resolvedDpr;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      // Resizing clears the canvas backing store, so every layer repaints.
      invalidateAll();
      schedule();
    },
    setTransform(next) {
      if (disposed) return;
      assertFiniteMatrix(next);
      matrix = next;
      invalidateAll();
      schedule();
    },
    async toBlob(options) {
      if (disposed) throw new StageConfigError('Cannot export a disposed stage.');
      const type = options?.type ?? 'image/png';
      const convertToBlob = (canvas as Partial<OffscreenCanvas>).convertToBlob;
      if (typeof convertToBlob === 'function') {
        // OffscreenCanvas (worker-rendered stages): promise-based export.
        const blob = await convertToBlob.call(canvas, { quality: options?.quality, type });
        if (!blob) throw new StageUnsupportedError('Canvas blob export returned no data.');
        return blob;
      }
      if (typeof canvas.toBlob !== 'function') {
        throw new StageUnsupportedError('This canvas does not support blob export.');
      }
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, type, options?.quality);
      });
      if (!blob) {
        throw new StageUnsupportedError('Canvas blob export returned no data.');
      }
      return blob;
    },
    get visibleRect() {
      return visibleRect();
    },
    get width() {
      return width;
    },
  };
  return stage;
}
