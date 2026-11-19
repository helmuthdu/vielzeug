// @vitest-environment jsdom
import type { FrameScheduler } from '@vielzeug/atlas';
import { describe, expect, it, vi } from 'vitest';
import { createStage, type StageSurface } from '../index';

/**
 * jsdom has no real canvas. A fake surface records the 2D calls the stage
 * makes so tests can assert DPR transforms, paint/composite order, and
 * dirty-layer behaviour without a GPU.
 */

type RecordedCall = { args: unknown[]; name: string };

type FakeContext = { calls: RecordedCall[] } & CanvasRenderingContext2D;

type FakeSurface = StageSurface & {
  calls: RecordedCall[];
  ctx: FakeContext;
  toBlob: (callback: (blob: Blob | null) => void) => void;
};

function makeContext(): FakeContext {
  const calls: RecordedCall[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push({ args, name });
    };
  const ctx = {
    beginPath: record('beginPath'),
    calls,
    clearRect: record('clearRect'),
    drawImage: record('drawImage'),
    fillRect: record('fillRect'),
    fillStyle: '#000',
    lineTo: record('lineTo'),
    moveTo: record('moveTo'),
    restore: record('restore'),
    save: record('save'),
    setTransform: record('setTransform'),
    stroke: record('stroke'),
  };
  return ctx as unknown as FakeContext;
}

function makeSurface(width: number, height: number): FakeSurface {
  const ctx = makeContext();
  return {
    calls: ctx.calls,
    ctx,
    getContext: () => ctx,
    height,
    toBlob: (cb: (blob: Blob | null) => void) => cb(new Blob(['surface'])),
    width,
  };
}

function makeCanvas(): HTMLCanvasElement & { ctx: FakeContext } {
  const ctx = makeContext();
  const canvas = {
    getContext: () => ctx,
    height: 0,
    width: 0,
  } as unknown as HTMLCanvasElement & { ctx: FakeContext };
  Object.defineProperty(canvas, 'ctx', { value: ctx });
  return canvas;
}

function makeScheduler() {
  let handle = 0;
  let clock = 0;
  const queued = new Map<number, (time: number) => void>();
  const scheduler: FrameScheduler = {
    cancelFrame: (id) => {
      queued.delete(id);
    },
    now: () => clock,
    requestFrame: (cb) => {
      handle += 1;
      queued.set(handle, cb);
      return handle;
    },
  };
  return {
    flush: (time = 16) => {
      clock = time;
      const entries = [...queued.entries()];
      queued.clear();
      for (const [, cb] of entries) cb(time);
    },
    pending: () => queued.size,
    scheduler,
  };
}

function setup(options: Partial<Parameters<typeof createStage>[1]> = {}) {
  const canvas = makeCanvas();
  const surfaces: FakeSurface[] = [];
  const created: Array<{ h: number; w: number }> = [];
  const frames = makeScheduler();
  const stage = createStage(canvas, {
    height: 200,
    layers: [],
    width: 400,
    ...options,
    createSurface: (w, h) => {
      created.push({ h, w });
      const surface = makeSurface(w, h);
      surfaces.push(surface);
      return surface;
    },
    scheduler: frames.scheduler,
  });
  return { canvas, created, frames, stage, surfaces };
}

describe('createStage', () => {
  it('sizes the canvas backing store by css size x dpr', () => {
    const { canvas } = setup({ dpr: 2, height: 100, width: 300 });
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(200);
  });

  it('rejects non-positive or non-finite sizes', () => {
    expect(() => setup({ height: 10, width: 0 })).toThrow(/positive finite/);
    expect(() => setup({ height: Number.NaN, width: 10 })).toThrow(/positive finite/);
    expect(() => setup({ dpr: 0, height: 10, width: 10 })).toThrow(/dpr/);
  });

  it('paints layers in registration order', () => {
    const order: string[] = [];
    const { stage } = setup({
      dpr: 2,
      layers: [
        { id: 'bg', paint: () => void order.push('bg') },
        { id: 'fg', paint: () => void order.push('fg') },
      ],
    });
    stage.setTransform([2, 0, 0, 2, 10, 20]);
    const info = stage.render(32);
    expect(order).toEqual(['bg', 'fg']);
    expect(info.repainted).toEqual(['bg', 'fg']);
    expect(info.time).toBe(32);
  });

  it('applies dpr multiplied into the world matrix on layer contexts', () => {
    const seen: unknown[][] = [];
    const { stage } = setup({
      dpr: 2,
      layers: [
        {
          id: 'a',
          paint: (ctx) => {
            const calls = (ctx as unknown as { calls: RecordedCall[] }).calls;
            const world = [...calls].reverse().find((c) => c.name === 'setTransform');
            seen.push(world?.args ?? []);
          },
        },
      ],
    });
    stage.setTransform([3, 0, 0, 3, 5, 6]);
    stage.render();
    // The stage resets to identity to clear, then sets the world transform
    // scaled by dpr: setTransform(dpr*a, dpr*b, dpr*c, dpr*d, dpr*e, dpr*f).
    expect(seen[0]).toEqual([6, 0, 0, 6, 10, 12]);
  });

  it('composites cached layers onto the canvas in order', () => {
    const { canvas, stage, surfaces } = setup({
      layers: [
        { id: 'a', paint: () => {} },
        { id: 'b', paint: () => {} },
      ],
    });
    stage.render();
    const draws = canvas.ctx.calls.filter((c) => c.name === 'drawImage');
    expect(draws).toHaveLength(2);
    expect(draws[0]?.args[0]).toBe(surfaces[0]);
    expect(draws[1]?.args[0]).toBe(surfaces[1]);
  });

  it('repaints only dirty layers on subsequent frames', () => {
    const paints: string[] = [];
    const { stage } = setup({
      layers: [
        { id: 'a', paint: () => void paints.push('a') },
        { id: 'b', paint: () => void paints.push('b') },
      ],
    });
    stage.render();
    expect(paints).toEqual(['a', 'b']);
    paints.length = 0;

    stage.invalidate('b');
    const info = stage.render();
    expect(paints).toEqual(['b']);
    expect(info.repainted).toEqual(['b']);
  });

  it('schedules a frame on invalidate and repaints it when the frame fires', () => {
    const paints: string[] = [];
    const { frames, stage } = setup({ layers: [{ id: 'a', paint: () => void paints.push('a') }] });
    stage.invalidate();
    expect(frames.pending()).toBe(1);
    frames.flush(100);
    expect(paints).toEqual(['a']);
    expect(frames.pending()).toBe(0);
  });

  it('coalesces multiple invalidations into one scheduled frame', () => {
    const { frames, stage } = setup({ layers: [{ id: 'a', paint: () => {} }] });
    stage.invalidate();
    stage.invalidate();
    stage.invalidate();
    expect(frames.pending()).toBe(1);
  });

  it('invalidates all layers on resize and transform changes', () => {
    const paints: string[] = [];
    const { stage } = setup({
      layers: [
        { id: 'a', paint: () => void paints.push('a') },
        { id: 'b', paint: () => void paints.push('b') },
      ],
    });
    stage.render();
    paints.length = 0;
    stage.setTransform([1, 0, 0, 1, 1, 0]);
    stage.render();
    expect(paints).toEqual(['a', 'b']);
    paints.length = 0;
    stage.resize({ height: 200, width: 400 });
    stage.render();
    expect(paints).toEqual(['a', 'b']);
  });

  it('reallocates backing surfaces when the pixel size changes', () => {
    const { stage, surfaces } = setup({ dpr: 1, layers: [{ id: 'a', paint: () => {} }] });
    stage.render();
    expect(surfaces[0]?.width).toBe(400);
    stage.resize({ height: 100, width: 200 });
    stage.render();
    expect(surfaces[1]?.width).toBe(200);
    expect(surfaces[1]?.height).toBe(100);
  });

  it('computes the visible world rect from the inverse transform', () => {
    const { stage } = setup();
    stage.setTransform([2, 0, 0, 2, 0, 0]);
    expect(stage.visibleRect).toEqual({ height: 100, width: 200, x: 0, y: 0 });
  });

  it('passes a world-space visible rect and dpr to paint callbacks', () => {
    let rect: unknown = null;
    let dprSeen = 0;
    const { stage } = setup({
      dpr: 1.5,
      layers: [
        {
          id: 'a',
          paint: (_ctx, frame) => {
            rect = frame.visibleRect;
            dprSeen = frame.dpr;
          },
        },
      ],
    });
    stage.render();
    expect(dprSeen).toBe(1.5);
    expect(rect).toEqual({ height: 200, width: 400, x: 0, y: 0 });
  });

  it('rejects duplicate layer ids at creation and unknown ids on invalidate', () => {
    expect(() =>
      setup({
        layers: [
          { id: 'a', paint: () => {} },
          { id: 'a', paint: () => {} },
        ],
      }),
    ).toThrow(/already registered/);
    const { stage } = setup({ layers: [{ id: 'a', paint: () => {} }] });
    expect(() => stage.invalidate('nope')).toThrow(/Unknown stage layer/);
  });

  it('flushes a pending frame before exporting a blob', async () => {
    const paints: string[] = [];
    const { canvas, frames, stage } = setup({ layers: [{ id: 'a', paint: () => void paints.push('a') }] });
    stage.render();
    paints.length = 0;
    stage.invalidate();
    expect(frames.pending()).toBe(1);
    canvas.toBlob = (cb) => cb(new Blob(['png']));
    await stage.toBlob();
    // toBlob must repaint synchronously instead of exporting the previous frame.
    expect(paints).toEqual(['a']);
    expect(frames.pending()).toBe(0);
  });

  it('exports via convertToBlob on an OffscreenCanvas', async () => {
    class FakeOffscreenCanvas {
      height = 0;
      width = 0;
      getContext() {
        return makeContext();
      }
      convertToBlob() {
        return Promise.resolve(new Blob(['offscreen']));
      }
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
    try {
      const canvas = new FakeOffscreenCanvas() as unknown as OffscreenCanvas;
      const stage = createStage(canvas, { height: 10, layers: [], width: 10 });
      const blob = await stage.toBlob();
      expect(await blob.text()).toBe('offscreen');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('defaults render time to the scheduler clock', () => {
    const { frames, stage } = setup({ layers: [{ id: 'a', paint: () => {} }] });
    frames.flush(128);
    expect(stage.render().time).toBe(128);
  });

  it('exports a PNG blob from the canvas', async () => {
    const { canvas, stage } = setup();
    const blob = new Blob(['png']);
    canvas.toBlob = (cb) => cb(blob);
    await expect(stage.toBlob()).resolves.toBe(blob);
  });

  it('throws a typed error when blob export is unavailable', async () => {
    const { stage } = setup();
    await expect(stage.toBlob()).rejects.toThrow(/does not support blob export/);
  });

  it('disposes: cancels scheduled frames, releases surfaces, and aborts the signal', () => {
    const { frames, stage, surfaces } = setup({ layers: [{ id: 'a', paint: () => {} }] });
    stage.render();
    stage.invalidate();
    expect(frames.pending()).toBe(1);
    const signal = stage.disposalSignal;
    stage.dispose();
    expect(frames.pending()).toBe(0);
    expect(stage.disposed).toBe(true);
    expect(signal.aborted).toBe(true);
    expect(surfaces[0]?.width).toBe(0);
    // Post-dispose calls are inert.
    stage.invalidate();
    expect(frames.pending()).toBe(0);
    expect(stage.render().repainted).toEqual([]);
  });

  it('is disposable via Symbol.dispose and idempotent', () => {
    const { stage } = setup();
    using auto = stage;
    auto.dispose();
    auto.dispose();
    expect(stage.disposed).toBe(true);
  });

  it('fills the configured background before compositing', () => {
    const { canvas, stage } = setup({
      background: '#123456',
      layers: [{ id: 'a', paint: () => {} }],
    });
    stage.render();
    expect(canvas.ctx.calls.some((c) => c.name === 'fillRect')).toBe(true);
  });

  it('rejects a non-finite transform', () => {
    const { stage } = setup();
    expect(() => stage.setTransform([Number.NaN, 0, 0, 1, 0, 0])).toThrow(/finite/);
  });

  describe('region/scale export', () => {
    it('re-paints layers into scratch surfaces at the requested pixel size', async () => {
      const { canvas, created, stage, surfaces } = setup({ dpr: 2, layers: [{ id: 'a', paint: () => {} }] });
      stage.render();
      created.length = 0;
      const liveSurfaces = [...surfaces];
      canvas.toBlob = (cb) => cb(new Blob(['png']));
      await stage.toBlob({ region: { height: 50, width: 80, x: 5, y: 7 }, scale: 3 });
      // Output surface plus one scratch per layer, sized round(region * scale).
      const scratch = surfaces.filter((s) => !liveSurfaces.includes(s));
      expect(scratch).toHaveLength(2);
      expect(created).toEqual([
        { h: 150, w: 240 },
        { h: 150, w: 240 },
      ]);
      // Scratch surfaces are released after the export.
      for (const surface of scratch) {
        expect(surface.width).toBe(0);
        expect(surface.height).toBe(0);
      }
    });

    it('paints layers with scale × translate(-region) and keeps live state untouched', async () => {
      const seen: unknown[][] = [];
      const { canvas, frames, stage, surfaces } = setup({
        dpr: 2,
        layers: [
          {
            id: 'a',
            paint: (ctx) => {
              const calls = (ctx as unknown as { calls: RecordedCall[] }).calls;
              const world = [...calls].reverse().find((c) => c.name === 'setTransform');
              seen.push(world?.args ?? []);
            },
          },
        ],
      });
      stage.setTransform([2, 0, 0, 2, 0, 0]);
      stage.render();
      seen.length = 0;
      const liveSurface = surfaces[0];
      canvas.toBlob = (cb) => cb(new Blob(['png']));
      await stage.toBlob({ region: { height: 100, width: 200, x: 10, y: 20 }, scale: 4 });
      // exportMatrix = translate(-10, -20) × scale(4) → [4, 0, 0, 4, -40, -80].
      expect(seen).toEqual([[4, 0, 0, 4, -40, -80]]);
      // Live viewport, transform, and dirty flags are unchanged: the live
      // layer surface survives intact, no frame is scheduled, and the next
      // render repaints nothing.
      expect(liveSurface.width).toBeGreaterThan(0);
      expect(frames.pending()).toBe(0);
      expect(stage.render().repainted).toEqual([]);
      expect(stage.matrix).toEqual([2, 0, 0, 2, 0, 0]);
    });

    it('composites scratch layers in registration order over the background', async () => {
      const { canvas, stage, surfaces } = setup({
        background: '#abcdef',
        layers: [
          { id: 'a', paint: () => {} },
          { id: 'b', paint: () => {} },
        ],
      });
      canvas.toBlob = (cb) => cb(new Blob(['png']));
      await stage.toBlob({ region: { height: 10, width: 10, x: 0, y: 0 }, scale: 1 });
      // Scratch order: [output, layer a, layer b]; the output surface receives
      // the background fill and both layer drawImage calls in order.
      const [output, layerA, layerB] = surfaces;
      expect(output?.ctx.calls.filter((c) => c.name === 'fillRect')).toHaveLength(1);
      const draws = output?.ctx.calls.filter((c) => c.name === 'drawImage') ?? [];
      expect(draws).toHaveLength(2);
      expect(draws[0]?.args[0]).toBe(layerA);
      expect(draws[1]?.args[0]).toBe(layerB);
    });

    it('defaults the region to the visible rect and scale to device pixels per world unit', async () => {
      const seen: unknown[][] = [];
      let frameDpr = 0;
      const { canvas, created, stage, surfaces } = setup({
        dpr: 2,
        layers: [
          {
            id: 'a',
            paint: (_ctx, frame) => {
              frameDpr = frame.dpr;
              const calls = (_ctx as unknown as { calls: RecordedCall[] }).calls;
              const world = [...calls].reverse().find((c) => c.name === 'setTransform');
              seen.push(world?.args ?? []);
            },
          },
        ],
      });
      stage.setTransform([2, 0, 0, 2, 0, 0]);
      stage.render();
      seen.length = 0;
      created.length = 0;
      canvas.toBlob = (cb) => cb(new Blob(['png']));
      // scale omitted → dpr × matrix scale = 4; region 200×100 world units →
      // 800×400 export pixels.
      await stage.toBlob({ region: { height: 100, width: 200, x: 0, y: 0 } });
      expect(seen).toEqual([[4, 0, 0, 4, 0, 0]]);
      expect(frameDpr).toBe(1);
      expect(created).toEqual([
        { h: 400, w: 800 },
        { h: 400, w: 800 },
      ]);
      expect(surfaces).toHaveLength(3);
    });

    it('rejects invalid regions and scales', async () => {
      const { stage } = setup({ layers: [{ id: 'a', paint: () => {} }] });
      await expect(stage.toBlob({ region: { height: 0, width: 10, x: 0, y: 0 } })).rejects.toThrow(/region/);
      await expect(stage.toBlob({ region: { height: 10, width: Number.NaN, x: 0, y: 0 } })).rejects.toThrow(/region/);
      await expect(
        stage.toBlob({ region: { height: 10, width: 10, x: Number.POSITIVE_INFINITY, y: 0 } }),
      ).rejects.toThrow(/region/);
      await expect(stage.toBlob({ scale: 0 })).rejects.toThrow(/scale/);
      await expect(stage.toBlob({ scale: Number.NaN })).rejects.toThrow(/scale/);
    });

    it('throws the disposed error for region export after dispose', async () => {
      const { stage } = setup({ layers: [{ id: 'a', paint: () => {} }] });
      stage.dispose();
      await expect(stage.toBlob({ region: { height: 10, width: 10, x: 0, y: 0 } })).rejects.toThrow(/disposed/i);
    });
  });
});
