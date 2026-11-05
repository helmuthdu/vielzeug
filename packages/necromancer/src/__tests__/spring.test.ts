import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NecromancerConfigError, spring } from '../index';

describe('spring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (query: string) => ({
      addEventListener: () => undefined,
      matches: false,
      media: query,
      removeEventListener: () => undefined,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Advance fake frames long enough for any default spring to settle. */
  const runFrames = (frames = 600): void => {
    vi.advanceTimersByTime(frames * 16);
  };

  it('drives onUpdate per frame and settles exactly on the target', async () => {
    const updates: number[] = [];
    const handle = spring(0, 100, (value) => updates.push(value), { motion: 'full' });

    runFrames();

    const result = await handle.result;

    expect(result).toEqual({ status: 'finished' });
    expect(updates.length).toBeGreaterThan(3);
    expect(updates.at(-1)).toBe(100);
  });

  it('overshoots the target when released with a strong initial velocity', async () => {
    const values: number[] = [];
    const handle = spring(0, 100, (value) => values.push(value), { motion: 'full', velocity: 2000 });

    runFrames();
    await handle.result;

    expect(Math.max(...values)).toBeGreaterThan(100);
    expect(values.at(-1)).toBe(100);
  });

  it('never overshoots when released at rest with default damping', async () => {
    const values: number[] = [];
    const handle = spring(0, 100, (value) => values.push(value), { motion: 'full' });

    runFrames();
    await handle.result;

    expect(Math.max(...values)).toBeLessThanOrEqual(100);
  });

  it('jumps straight to the target under reduced motion', async () => {
    const updates: number[] = [];
    const handle = spring(0, 100, (value) => updates.push(value), { motion: 'reduced' });

    const result = await handle.result;

    expect(result).toEqual({ status: 'finished' });
    expect(updates).toEqual([100]);
  });

  it('honors the system preference when it requests reduction', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('matchMedia', (query: string) => ({
      addEventListener: () => undefined,
      matches: true,
      media: query,
      removeEventListener: () => undefined,
    }));

    const updates: number[] = [];
    const handle = spring(0, 100, (value) => updates.push(value));

    await handle.result;

    expect(updates).toEqual([100]);
  });

  it('reports the interrupting reason when disposed mid-flight', async () => {
    const handle = spring(0, 100, () => undefined, { motion: 'full' });

    vi.advanceTimersByTime(48);
    handle.dispose('interrupted');

    await expect(handle.result).resolves.toEqual({ reason: 'interrupted', status: 'cancelled' });
    expect(handle.disposed).toBe(true);
  });

  it('stops calling onUpdate after disposal', () => {
    const onUpdate = vi.fn();
    const handle = spring(0, 100, onUpdate, { motion: 'full' });

    vi.advanceTimersByTime(48);
    handle.dispose();
    const callsAtDispose = onUpdate.mock.calls.length;
    vi.advanceTimersByTime(200);

    expect(onUpdate).toHaveBeenCalledTimes(callsAtDispose);
  });

  it('disposes through an external signal', async () => {
    const controller = new AbortController();
    const handle = spring(0, 100, () => undefined, { motion: 'full', signal: controller.signal });

    vi.advanceTimersByTime(48);
    controller.abort();

    await expect(handle.result).resolves.toMatchObject({ status: 'cancelled' });
    expect(handle.disposed).toBe(true);
  });

  it('throws through an already-aborted signal', () => {
    const controller = new AbortController();
    controller.abort();

    expect(() => spring(0, 100, () => undefined, { signal: controller.signal })).toThrow();
  });

  it('rejects non-positive spring parameters', () => {
    expect(() => spring(0, 1, () => undefined, { stiffness: 0 })).toThrow(NecromancerConfigError);
    expect(() => spring(0, 1, () => undefined, { damping: -1 })).toThrow(NecromancerConfigError);
    expect(() => spring(0, 1, () => undefined, { mass: Number.NaN })).toThrow(NecromancerConfigError);
  });

  it('rejects a non-finite initial velocity', () => {
    expect(() => spring(0, 1, () => undefined, { velocity: Number.POSITIVE_INFINITY })).toThrow(NecromancerConfigError);
  });

  it('rejects non-finite endpoints, which could never come to rest', () => {
    expect(() => spring(Number.NaN, 1, () => undefined)).toThrow(NecromancerConfigError);
    expect(() => spring(0, Number.POSITIVE_INFINITY, () => undefined)).toThrow(NecromancerConfigError);
  });

  it('accepts zero and negative endpoints', async () => {
    const values: number[] = [];
    const handle = spring(-40, 0, (value) => values.push(value), { motion: 'full' });

    for (let i = 0; i < 400 && !handle.disposed; i++) {
      vi.advanceTimersByTime(16);
    }

    await handle.result;

    expect(values[0]).toBeCloseTo(-40, 0);
    expect(values.at(-1)).toBe(0);
  });

  it('disposes with Symbol.dispose', () => {
    const handle = spring(0, 100, () => undefined, { motion: 'full' });

    vi.advanceTimersByTime(32);
    handle[Symbol.dispose]();

    expect(handle.disposed).toBe(true);
  });

  it('settles a spring already at rest in one frame', async () => {
    const updates: number[] = [];
    const handle = spring(100, 100, (value) => updates.push(value), { motion: 'full' });

    vi.advanceTimersByTime(16);

    await expect(handle.result).resolves.toEqual({ status: 'finished' });
    expect(updates).toEqual([100]);
  });
});
