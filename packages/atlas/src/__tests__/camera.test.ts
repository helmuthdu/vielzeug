import { describe, expect, it, vi } from 'vitest';
import { createCamera, type FrameScheduler } from '../camera.js';
import { AtlasConfigError } from '../errors.js';

const viewport = { x: 800, y: 600 };

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
  it('maps world through the identity state', () => {
    const camera = createCamera();
    expect(camera.toScreen({ x: 5, y: -2 })).toEqual({ x: 5, y: -2 });
    expect(camera.toWorld({ x: 5, y: -2 })).toEqual({ x: 5, y: -2 });
    camera.dispose();
  });

  it('round-trips screen and world through pan, zoom, and rotation', () => {
    const camera = createCamera({ initial: { rotation: 0.6, x: 12, y: -8, zoom: 2.5 } });
    const world = { x: 100, y: -50 };
    const roundTrip = camera.toWorld(camera.toScreen(world));
    expect(roundTrip.x).toBeCloseTo(world.x, 9);
    expect(roundTrip.y).toBeCloseTo(world.y, 9);
    camera.dispose();
  });

  it('pans in screen space so content follows the drag', () => {
    const camera = createCamera({ initial: { zoom: 2 } });
    camera.panBy(10, 0);
    const moved = camera.toScreen({ x: 0, y: 0 });
    expect(moved.x).toBeCloseTo(10, 9);
    camera.dispose();
  });

  it('keeps the world point under the anchor fixed while zooming', () => {
    const camera = createCamera({ initial: { rotation: 0.3, x: 40, y: 90, zoom: 1.5 } });
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
    const camera = createCamera({ initial: { zoom: 1 }, maxZoom: 2, minZoom: 0.5 });
    const anchor = { x: 100, y: 100 };
    const before = camera.toWorld(anchor);
    camera.zoomAt(anchor, 10);
    expect(camera.state.zoom).toBe(2);
    const after = camera.toWorld(anchor);
    expect(after.x).toBeCloseTo(before.x, 9);
    camera.dispose();
  });

  it('keeps the world point under the anchor fixed while rotating', () => {
    const camera = createCamera({ initial: { x: 33, y: -17, zoom: 3 } });
    const anchor = { x: 250, y: 400 };
    const before = camera.toWorld(anchor);
    camera.rotateAt(anchor, 0.9);
    const after = camera.toWorld(anchor);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
    camera.dispose();
  });

  it('fits bounds into the viewport with padding', () => {
    const camera = createCamera();
    const bounds = { height: 100, width: 200, x: 50, y: 50 };
    camera.fitBounds(bounds, { padding: 20, size: viewport });
    expect(camera.state.zoom).toBeCloseTo((800 - 40) / 200, 9);
    const center = camera.toScreen({ x: 150, y: 100 });
    expect(center.x).toBeCloseTo(400, 9);
    expect(center.y).toBeCloseTo(300, 9);
    camera.dispose();
  });

  it('fits bounds with rotation so the world center lands on the viewport center', () => {
    const camera = createCamera({ initial: { rotation: 0.8 } });
    const bounds = { height: 40, width: 60, x: 0, y: 0 };
    camera.fitBounds(bounds, { size: viewport });
    const center = camera.toScreen({ x: 30, y: 20 });
    expect(center.x).toBeCloseTo(400, 6);
    expect(center.y).toBeCloseTo(300, 6);
    camera.dispose();
  });

  it('reports the rotated visible rect as a world AABB containing all corners', () => {
    const camera = createCamera({ initial: { rotation: Math.PI / 4, zoom: 2 } });
    const rect = camera.visibleRect(viewport);
    for (const corner of [
      { x: 0, y: 0 },
      { x: viewport.x, y: 0 },
      { x: 0, y: viewport.y },
      { x: viewport.x, y: viewport.y },
    ]) {
      const world = camera.toWorld(corner);
      expect(world.x).toBeGreaterThanOrEqual(rect.x - 1e-9);
      expect(world.x).toBeLessThanOrEqual(rect.x + rect.width + 1e-9);
      expect(world.y).toBeGreaterThanOrEqual(rect.y - 1e-9);
      expect(world.y).toBeLessThanOrEqual(rect.y + rect.height + 1e-9);
    }
    camera.dispose();
  });

  it('animates to a target through the injected scheduler', () => {
    const scheduler = fakeScheduler();
    const camera = createCamera({ scheduler });
    const onDone = vi.fn();
    camera.animateTo({ x: 100, zoom: 4 }, { duration: 100, onDone });
    scheduler.advance(50);
    expect(camera.state.x).toBeGreaterThan(0);
    expect(camera.state.x).toBeLessThan(100);
    scheduler.advance(50);
    expect(camera.state.x).toBeCloseTo(100, 9);
    expect(camera.state.zoom).toBeCloseTo(4, 9);
    expect(onDone).toHaveBeenCalledWith(true);
    camera.dispose();
  });

  it('takes the shortest rotation path when animating', () => {
    const scheduler = fakeScheduler();
    const camera = createCamera({ initial: { rotation: 3.0 }, scheduler });
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
    const camera = createCamera({ scheduler });
    const controller = new AbortController();
    const onDone = vi.fn();
    camera.animateTo({ x: 100 }, { duration: 100, onDone, signal: controller.signal });
    scheduler.advance(25);
    controller.abort();
    expect(onDone).toHaveBeenCalledWith(false);
    expect(scheduler.pending()).toBe(0);
    camera.dispose();
  });

  it('notifies subscribers on state changes until unsubscribed', () => {
    const camera = createCamera();
    const listener = vi.fn();
    const unsubscribe = camera.subscribe(listener);
    camera.panBy(5, 0);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    camera.panBy(5, 0);
    expect(listener).toHaveBeenCalledTimes(1);
    camera.dispose();
  });

  it('disposes: aborts the signal and rejects further inserts of animation', () => {
    const camera = createCamera();
    camera.dispose();
    expect(camera.disposed).toBe(true);
    expect(camera.disposalSignal.aborted).toBe(true);
    camera.animateTo({ x: 5 }, { duration: 50 });
    expect(camera.state.x).toBe(0);
  });

  it('rejects invalid zoom clamps and factors', () => {
    expect(() => createCamera({ maxZoom: 1, minZoom: 2 })).toThrow(AtlasConfigError);
    const camera = createCamera();
    expect(() => camera.zoomAt({ x: 0, y: 0 }, 0)).toThrow(AtlasConfigError);
    camera.dispose();
  });
});
