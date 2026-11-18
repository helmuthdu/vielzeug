import { describe, expect, it, vi } from 'vitest';
import { createCamera, type FrameScheduler } from '../camera.js';
import { AtlasConfigError } from '../errors.js';
import { apply } from '../matrix.js';

const viewport = { height: 600, width: 800 };

function fakeScheduler(): FrameScheduler & { advance(ms: number): void; pending(): number } {
  let nowValue = 0;
  const queue = new Map<number, (time: number) => void>();
  let nextHandle = 1;
  return {
    advance(ms: number) {
      nowValue += ms;
      const callbacks = [...queue.entries()];
      queue.clear();
      for (const [, callback] of callbacks) callback(nowValue);
    },
    cancelFrame(handle) {
      queue.delete(handle);
    },
    now: () => nowValue,
    pending() {
      return queue.size;
    },
    requestFrame(callback) {
      const handle = nextHandle++;
      queue.set(handle, callback);
      return handle;
    },
  };
}

describe('createCamera', () => {
  it('maps world through the identity state at a 0x0 viewport', () => {
    const camera = createCamera();
    expect(camera.toScreen({ x: 5, y: -2 })).toEqual({ x: 5, y: -2 });
    expect(camera.toWorld({ x: 5, y: -2 })).toEqual({ x: 5, y: -2 });
    camera.dispose();
  });

  it('places the state point at the viewport centre', () => {
    const camera = createCamera({ initial: { x: 40, y: -10 }, viewport });
    expect(camera.toScreen({ x: 40, y: -10 })).toEqual({ x: 400, y: 300 });
    camera.dispose();
  });

  it('round-trips screen and world through pan, zoom, and rotation', () => {
    const camera = createCamera({
      initial: { rotation: 0.6, x: 12, y: -8, zoom: 2.5 },
      viewport,
    });
    const world = { x: 100, y: -50 };
    const roundTrip = camera.toWorld(camera.toScreen(world));
    expect(roundTrip.x).toBeCloseTo(world.x, 9);
    expect(roundTrip.y).toBeCloseTo(world.y, 9);
    camera.dispose();
  });

  it('pans in screen space so content follows the drag', () => {
    const camera = createCamera({ initial: { zoom: 2 }, viewport });
    const before = camera.toScreen({ x: 0, y: 0 });
    camera.panBy(10, 0);
    const moved = camera.toScreen({ x: 0, y: 0 });
    expect(moved.x - before.x).toBeCloseTo(10, 9);
    expect(moved.y - before.y).toBeCloseTo(0, 9);
    camera.dispose();
  });

  it('keeps the world point under the anchor fixed while zooming', () => {
    const camera = createCamera({ initial: { rotation: 0.3, x: 40, y: 90, zoom: 1.5 }, viewport });
    const anchor = { x: 300, y: 200 };
    const before = camera.toWorld(anchor);
    camera.zoomAt(anchor, 2.5);
    const after = camera.toWorld(anchor);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
    expect(camera.state.zoom).toBeCloseTo(3.75, 9);
    camera.dispose();
  });

  it('clamps zoom and keeps the anchor fixed at the clamp', () => {
    const camera = createCamera({ initial: { zoom: 1 }, maxZoom: 2, minZoom: 0.5, viewport });
    const anchor = { x: 100, y: 100 };
    const before = camera.toWorld(anchor);
    camera.zoomAt(anchor, 10);
    expect(camera.state.zoom).toBe(2);
    const after = camera.toWorld(anchor);
    expect(after.x).toBeCloseTo(before.x, 9);
    camera.dispose();
  });

  it('keeps the world point under the anchor fixed while rotating', () => {
    const camera = createCamera({ initial: { x: 33, y: -17, zoom: 3 }, viewport });
    const anchor = { x: 250, y: 400 };
    const before = camera.toWorld(anchor);
    camera.rotateAt(anchor, 0.9);
    const after = camera.toWorld(anchor);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
    camera.dispose();
  });

  it('fits bounds into the viewport with padding', () => {
    const camera = createCamera({ viewport });
    const bounds = { height: 100, width: 200, x: 50, y: 50 };
    camera.fitBounds(bounds, { padding: 20 });
    expect(camera.state.zoom).toBeCloseTo((800 - 40) / 200, 9);
    const center = camera.toScreen({ x: 150, y: 100 });
    expect(center.x).toBeCloseTo(400, 9);
    expect(center.y).toBeCloseTo(300, 9);
    camera.dispose();
  });

  it('fits bounds with rotation so the world center lands on the viewport center', () => {
    const camera = createCamera({ initial: { rotation: 0.8 }, viewport });
    const bounds = { height: 40, width: 60, x: 0, y: 0 };
    camera.fitBounds(bounds);
    const center = camera.toScreen({ x: 30, y: 20 });
    expect(center.x).toBeCloseTo(400, 6);
    expect(center.y).toBeCloseTo(300, 6);
    camera.dispose();
  });

  it('reports the rotated visible rect as a world AABB containing all corners', () => {
    const camera = createCamera({ initial: { rotation: Math.PI / 4, zoom: 2 }, viewport });
    const rect = camera.visibleRect;
    for (const corner of [
      { x: 0, y: 0 },
      { x: viewport.width, y: 0 },
      { x: 0, y: viewport.height },
      { x: viewport.width, y: viewport.height },
    ]) {
      const world = camera.toWorld(corner);
      expect(world.x).toBeGreaterThanOrEqual(rect.x - 1e-9);
      expect(world.x).toBeLessThanOrEqual(rect.x + rect.width + 1e-9);
      expect(world.y).toBeGreaterThanOrEqual(rect.y - 1e-9);
      expect(world.y).toBeLessThanOrEqual(rect.y + rect.height + 1e-9);
    }
    camera.dispose();
  });

  it('resizes while keeping the world centre fixed', () => {
    const camera = createCamera({ initial: { rotation: 0.4, x: 25, y: 75, zoom: 2 }, viewport });
    const centreBefore = camera.toWorld({ x: 400, y: 300 });
    camera.resize({ height: 400, width: 1000 });
    expect(camera.viewport).toEqual({ height: 400, width: 1000 });
    const centreAfter = camera.toWorld({ x: 500, y: 200 });
    expect(centreAfter.x).toBeCloseTo(centreBefore.x, 9);
    expect(centreAfter.y).toBeCloseTo(centreBefore.y, 9);
    expect(camera.state.x).toBeCloseTo(25, 9);
    camera.dispose();
  });

  it('notifies subscribers on resize', () => {
    const camera = createCamera({ viewport });
    const listener = vi.fn();
    camera.subscribe(listener);
    camera.resize({ height: 500, width: 700 });
    expect(listener).toHaveBeenCalledTimes(1);
    camera.resize({ height: 500, width: 700 });
    expect(listener).toHaveBeenCalledTimes(1);
    camera.dispose();
  });

  it('jumps immediately with set, cancelling animation', () => {
    const scheduler = fakeScheduler();
    const camera = createCamera({ scheduler, viewport });
    camera.animateTo({ x: 100 }, { duration: 100 });
    scheduler.advance(25);
    camera.set({ x: 50, zoom: 3 });
    expect(camera.state.x).toBe(50);
    expect(camera.state.zoom).toBe(3);
    expect(scheduler.pending()).toBe(0);
    camera.dispose();
  });

  it('animates to a target through the injected scheduler', () => {
    const scheduler = fakeScheduler();
    const camera = createCamera({ scheduler, viewport });
    camera.animateTo({ x: 100, zoom: 4 }, { duration: 100 });
    scheduler.advance(50);
    expect(camera.state.x).toBeGreaterThan(0);
    expect(camera.state.x).toBeLessThan(100);
    scheduler.advance(50);
    expect(camera.state.x).toBeCloseTo(100, 9);
    expect(camera.state.zoom).toBeCloseTo(4, 9);
    expect(scheduler.pending()).toBe(0);
    camera.dispose();
  });

  it('keeps the viewport centre fixed while animating zoom', () => {
    const scheduler = fakeScheduler();
    const camera = createCamera({ initial: { x: 10, y: -5, zoom: 1 }, scheduler, viewport });
    const centre = camera.toWorld({ x: 400, y: 300 });
    camera.animateTo({ zoom: 4 }, { duration: 100 });
    scheduler.advance(50);
    const mid = camera.toWorld({ x: 400, y: 300 });
    expect(mid.x).toBeCloseTo(centre.x, 6);
    expect(mid.y).toBeCloseTo(centre.y, 6);
    scheduler.advance(50);
    const end = camera.toWorld({ x: 400, y: 300 });
    expect(end.x).toBeCloseTo(centre.x, 6);
    expect(end.y).toBeCloseTo(centre.y, 6);
    camera.dispose();
  });

  it('cancels a running animation when the user pans, zooms, or rotates', () => {
    for (const interact of [
      (camera: ReturnType<typeof createCamera>) => camera.panBy(5, 5),
      (camera: ReturnType<typeof createCamera>) => camera.zoomAt({ x: 10, y: 10 }, 1.5),
      (camera: ReturnType<typeof createCamera>) => camera.rotateAt({ x: 10, y: 10 }, 0.2),
      (camera: ReturnType<typeof createCamera>) => camera.fitBounds({ height: 10, width: 10, x: 0, y: 0 }),
    ]) {
      const scheduler = fakeScheduler();
      const camera = createCamera({ scheduler, viewport });
      camera.animateTo({ x: 100 }, { duration: 100 });
      scheduler.advance(25);
      interact(camera);
      expect(scheduler.pending()).toBe(0);
      const xAfterInput = camera.state.x;
      scheduler.advance(100);
      // The cancelled animation must not overwrite the user's input.
      expect(camera.state.x).toBe(xAfterInput);
      camera.dispose();
    }
  });

  it('takes the shortest rotation path when animating', () => {
    const scheduler = fakeScheduler();
    const camera = createCamera({ initial: { rotation: 3.0 }, scheduler, viewport });
    camera.animateTo({ rotation: -3.0 }, { duration: 100 });
    scheduler.advance(50);
    // Shortest path passes through ±π, not back through 0.
    expect(Math.abs(camera.state.rotation)).toBeGreaterThan(3);
    scheduler.advance(50);
    expect(camera.state.rotation).toBeCloseTo(-3.0, 9);
    camera.dispose();
  });

  it('replaces a running animation and honors the abort signal', () => {
    const scheduler = fakeScheduler();
    const camera = createCamera({ scheduler, viewport });
    const controller = new AbortController();
    camera.animateTo({ x: 100 }, { duration: 100, signal: controller.signal });
    scheduler.advance(25);
    controller.abort();
    expect(scheduler.pending()).toBe(0);
    expect(camera.state.x).toBeLessThan(100);
    camera.dispose();
  });

  it('notifies subscribers on state changes until unsubscribed', () => {
    const camera = createCamera({ viewport });
    const listener = vi.fn();
    const unsubscribe = camera.subscribe(listener);
    camera.panBy(5, 0);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    camera.panBy(5, 0);
    expect(listener).toHaveBeenCalledTimes(1);
    camera.dispose();
  });

  it('ignores subscribe with an already-aborted signal', () => {
    const camera = createCamera({ viewport });
    const listener = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const unsubscribe = camera.subscribe(listener, { signal: controller.signal });
    camera.panBy(5, 0);
    expect(listener).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
    camera.dispose();
  });

  it('disposes: aborts the signal and no-ops further mutation', () => {
    const scheduler = fakeScheduler();
    const camera = createCamera({ scheduler, viewport });
    const listener = vi.fn();
    camera.subscribe(listener);
    camera.dispose();
    expect(camera.disposed).toBe(true);
    expect(camera.disposalSignal.aborted).toBe(true);
    camera.animateTo({ x: 5 }, { duration: 50 });
    camera.panBy(10, 10);
    camera.zoomAt({ x: 0, y: 0 }, 2);
    camera.rotateAt({ x: 0, y: 0 }, 1);
    camera.fitBounds({ height: 10, width: 10, x: 0, y: 0 });
    camera.set({ x: 9 });
    camera.resize({ height: 1, width: 1 });
    expect(scheduler.pending()).toBe(0);
    expect(camera.state.x).toBe(0);
    expect(camera.viewport).toEqual(viewport);
    expect(listener).not.toHaveBeenCalled();
    // Subscribing after dispose is a no-op, not a leak.
    const late = vi.fn();
    camera.subscribe(late);
    expect(late).not.toHaveBeenCalled();
  });

  it('exposes a non-null inverse matrix', () => {
    const camera = createCamera({ initial: { rotation: 0.5, zoom: 3 }, viewport });
    expect(camera.inverse).toHaveLength(6);
    const point = { x: 123, y: -45 };
    const roundTrip = apply(camera.inverse, apply(camera.matrix, point));
    expect(roundTrip.x).toBeCloseTo(point.x, 9);
    expect(roundTrip.y).toBeCloseTo(point.y, 9);
    camera.dispose();
  });

  it('rejects invalid zoom clamps and factors', () => {
    expect(() => createCamera({ maxZoom: 1, minZoom: 2 })).toThrow(AtlasConfigError);
    const camera = createCamera({ viewport });
    expect(() => camera.zoomAt({ x: 0, y: 0 }, 0)).toThrow(AtlasConfigError);
    camera.dispose();
  });
});
