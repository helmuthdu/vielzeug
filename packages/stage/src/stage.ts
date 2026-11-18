import {
  apply,
  type FrameScheduler,
  invert,
  type Matrix,
  multiply,
  type Point,
  type Rect,
  rectFromPoints,
  type Size,
  scale as scaleMatrix,
  scaleOf,
  translate,
} from '@vielzeug/atlas';
import { requireDpr, requireFiniteMatrix, requireRect, requireScale, requireSize } from './_validate.js';
import { StageConfigError, StageDisposedError, StageUnsupportedError } from './errors.js';

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
  /** Layers are fixed at creation, bottom-first; hide one by returning early from its paint. */
  layers: readonly StageLayerOptions[];
  /** Reuses the atlas camera scheduler contract; defaults to `requestAnimationFrame`. */
  scheduler?: FrameScheduler;
  createSurface?: CreateSurface;
  /** Background color cleared under the layers; defaults to transparent. */
  background?: string | null;
}>;

/** Options for `toBlob()`: blob encoding plus an optional world-space crop and pixel density. */
export type StageBlobOptions = Readonly<{
  /** Blob MIME type; defaults to `image/png`. */
  type?: string;
  /** Encoder quality for lossy types. */
  quality?: number;
  /**
   * World-space rect to export; defaults to the current visible rect. The
   * export re-paints every layer against the region transform, so cost is a
   * full repaint, not a blit of the cached composite.
   */
  region?: Rect;
  /**
   * Export pixels per world unit. Defaults to the current device pixels per
   * world unit (`dpr × matrix scale`), which matches the on-screen density.
   */
  scale?: number;
}>;

export type StageFrameInfo = Readonly<{
  /** Layer ids that were repainted for this frame. */
  repainted: readonly string[];
  time: number;
}>;

/**
 * The control surface both stage modes share: a main-thread `Stage` and a
 * `WorkerStage` client are interchangeable wherever only control is needed.
 */
export type StageController = Readonly<{
  /** Resize the CSS size and DPR; reallocates backing surfaces and invalidates all. */
  resize: (size: Size, dpr?: number) => void;
  /** Set the world→screen matrix; invalidates all layers. */
  setTransform: (matrix: Matrix) => void;
  /** Mark one layer dirty (omit to mark all); schedules a frame. */
  invalidate: (layerId?: string) => void;
  /**
   * Export the current frame as a blob. With `region`/`scale`, layers are
   * re-painted into scratch surfaces at the requested crop and density;
   * the live viewport is untouched.
   */
  toBlob: (options?: StageBlobOptions) => Promise<Blob>;
  dispose: () => void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose]: () => void;
}>;

export type Stage = StageController &
  Readonly<{
    readonly canvas: HTMLCanvasElement | OffscreenCanvas;
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
    /** Current world→screen matrix (CSS pixels, without DPR). */
    readonly matrix: Matrix;
    readonly visibleRect: Rect;
    /** Run any pending repaint/composite synchronously; defaults `time` to the scheduler clock. */
    render: (time?: number) => StageFrameInfo;
  }>;

const DEFAULT_SCHEDULER: FrameScheduler = {
  // Workers may lack requestAnimationFrame; fall back to a timer there.
  cancelFrame: (handle) => {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
    else clearTimeout(handle);
  },
  now: () => performance.now(),
  requestFrame: (callback) =>
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(callback)
      : (setTimeout(() => callback(performance.now()), 16) as unknown as number),
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
 * applies the world→screen matrix and DPR to the context transform. The
 * caller owns the canvas CSS size; the stage only sizes the backing store.
 */
export function createStage(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options: StageOptions & Readonly<{ width: number; height: number }>,
): Stage {
  const { width: initialWidth, height: initialHeight } = options;
  requireSize({ height: initialHeight, width: initialWidth }, 'Stage');
  requireDpr(options.dpr ?? 1, 'Stage');
  const scheduler = options.scheduler ?? DEFAULT_SCHEDULER;
  const createSurface = options.createSurface ?? defaultCreateSurface;
  const background = options.background ?? null;

  const controller = new AbortController();
  let disposed = false;
  let width = initialWidth;
  let height = initialHeight;
  let dpr = options.dpr ?? 1;
  let matrix: Matrix = [1, 0, 0, 1, 0, 0];
  let frameHandle: number | null = null;
  let pending = false;

  const layers: LayerRecord[] = [];
  for (const opts of options.layers) {
    if (layers.some((layer) => layer.id === opts.id)) {
      throw new StageConfigError(`Stage layer id "${opts.id}" is already registered.`);
    }
    layers.push({ ctx: null, dirty: true, id: opts.id, paint: opts.paint, surface: null });
  }

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
    const inv = invert(matrix);
    if (!inv) return { height, width, x: 0, y: 0 };
    const corners: [Point, Point, Point, Point] = [
      apply(inv, { x: 0, y: 0 }),
      apply(inv, { x: width, y: 0 }),
      apply(inv, { x: 0, y: height }),
      apply(inv, { x: width, y: height }),
    ];
    return rectFromPoints(corners);
  };

  const applyWorldTransform = (ctx: CanvasRenderingContext2D): void => {
    const [a, b, c, d, e, f] = matrix;
    ctx.setTransform(dpr * a, dpr * b, dpr * c, dpr * d, dpr * e, dpr * f);
  };

  /** Rasterize a surface (live canvas or scratch) into a blob; shared by both export paths. */
  const surfaceToBlob = async (surface: StageSurface, type: string, quality?: number): Promise<Blob> => {
    if (typeof OffscreenCanvas !== 'undefined' && surface instanceof OffscreenCanvas) {
      // OffscreenCanvas (worker-rendered stages): promise-based export.
      const blob = await surface.convertToBlob({ quality, type });
      if (!blob) throw new StageUnsupportedError('Canvas blob export returned no data.');
      return blob;
    }
    const htmlCanvas = surface as unknown as HTMLCanvasElement;
    if (typeof htmlCanvas.toBlob !== 'function') {
      throw new StageUnsupportedError('This canvas does not support blob export.');
    }
    const blob = await new Promise<Blob | null>((resolve) => {
      htmlCanvas.toBlob(resolve, type, quality);
    });
    if (!blob) {
      throw new StageUnsupportedError('Canvas blob export returned no data.');
    }
    return blob;
  };

  /**
   * Region/scale export: layer caches are keyed to the live viewport
   * transform, so the requested crop cannot blit the cached composite. Every
   * layer is re-painted into scratch surfaces against the export transform
   * `translate(-region) × scale` (dpr 1; `scale` maps world units to export
   * pixels) and composited into a scratch output surface. The live frame,
   * caches, and dirty flags are untouched; the cost is a full repaint.
   */
  const exportRegion = async (options: StageBlobOptions, type: string): Promise<Blob> => {
    const region = options.region ?? visibleRect();
    requireRect(region, 'Export');
    // Default density matches the on-screen one: device pixels per world unit.
    const exportScale = options.scale ?? dpr * scaleOf(matrix);
    requireScale(exportScale, 'Export');
    const pw = Math.max(1, Math.round(region.width * exportScale));
    const ph = Math.max(1, Math.round(region.height * exportScale));
    const exportMatrix = multiply(scaleMatrix(exportScale), translate(-region.x, -region.y));
    const frame: PaintContext = { dpr: 1, matrix: exportMatrix, time: scheduler.now(), visibleRect: region };
    const scratch: StageSurface[] = [];
    try {
      const output = createSurface(pw, ph);
      scratch.push(output);
      const outCtx = output.getContext('2d', { alpha: true }) as CanvasRenderingContext2D | null;
      if (outCtx == null) {
        throw new StageUnsupportedError('Export surface has no 2D context.');
      }
      outCtx.setTransform(1, 0, 0, 1, 0, 0);
      outCtx.clearRect(0, 0, pw, ph);
      if (background != null) {
        outCtx.fillStyle = background;
        outCtx.fillRect(0, 0, pw, ph);
      }
      for (const layer of layers) {
        const surface = createSurface(pw, ph);
        scratch.push(surface);
        const ctx = surface.getContext('2d', { alpha: true }) as CanvasRenderingContext2D | null;
        if (ctx == null) {
          throw new StageUnsupportedError(`Layer surface for "${layer.id}" has no 2D context.`);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, pw, ph);
        const [a, b, c, d, e, f] = exportMatrix;
        ctx.setTransform(a, b, c, d, e, f);
        layer.paint(ctx, frame);
        outCtx.drawImage(surface as unknown as CanvasImageSource, 0, 0, pw, ph);
      }
      return await surfaceToBlob(output, type, options.quality);
    } finally {
      for (const surface of scratch) {
        surface.width = 0;
        surface.height = 0;
      }
    }
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

  const stage: Stage = {
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
    get matrix() {
      return matrix;
    },
    render(time) {
      if (disposed) return { repainted: [], time: time ?? scheduler.now() };
      cancelFrame();
      return renderFrame(time ?? scheduler.now());
    },
    resize(size, nextDpr) {
      if (disposed) return;
      requireSize(size, 'Stage');
      const resolvedDpr = nextDpr ?? dpr;
      requireDpr(resolvedDpr, 'Stage');
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
      requireFiniteMatrix(next);
      matrix = next;
      invalidateAll();
      schedule();
    },
    async toBlob(blobOptions) {
      if (disposed) throw new StageDisposedError('Cannot export a disposed stage.');
      // Export must capture the current frame, not the last painted one.
      if (pending) stage.render();
      const type = blobOptions?.type ?? 'image/png';
      if (blobOptions?.region != null || blobOptions?.scale != null) {
        return await exportRegion(blobOptions, type);
      }
      return await surfaceToBlob(canvas, type, blobOptions?.quality);
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
