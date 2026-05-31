import { describe, expect, it, vi } from 'vitest';

import { createBatcher } from '../batcher';

describe('createBatcher', () => {
  it('coalesces concurrent load() calls into a single resolve()', async () => {
    let batchCount = 0;

    const batcher = createBatcher({
      resolve: async (keys: number[]) => {
        batchCount++;

        return keys.map((k) => k * 2);
      },
    });

    const [a, b, c] = await Promise.all([batcher.load(1), batcher.load(2), batcher.load(3)]);

    expect(batchCount).toBe(1);
    expect(a).toBe(2);
    expect(b).toBe(4);
    expect(c).toBe(6);
  });

  it('returns results in the same order as keys', async () => {
    const batcher = createBatcher({
      resolve: async (keys: string[]) => keys.map((k) => `processed:${k}`),
    });

    const [x, y] = await Promise.all([batcher.load('a'), batcher.load('b')]);

    expect(x).toBe('processed:a');
    expect(y).toBe('processed:b');
  });

  it('splits into multiple batches when maxSize is reached', async () => {
    const batches: number[][] = [];

    const batcher = createBatcher({
      maxSize: 2,
      resolve: async (keys: number[]) => {
        batches.push([...keys]);

        return keys;
      },
    });

    const [r1, r2, r3] = await Promise.all([batcher.load(1), batcher.load(2), batcher.load(3)]);

    // With maxSize=2 and 3 items: first batch is force-flushed at capacity, second
    // batch is scheduled on the microtask queue for the remaining item.
    expect(batches.length).toBe(2);
    expect(batches[0]).toEqual([1, 2]);
    expect(batches[1]).toEqual([3]);
    expect(r1).toBe(1);
    expect(r2).toBe(2);
    expect(r3).toBe(3);
  });

  it('rejects all pending items when resolve() throws', async () => {
    const batcher = createBatcher({
      resolve: async (_keys: number[]) => {
        throw new Error('batch failed');
      },
    });

    await expect(Promise.all([batcher.load(1), batcher.load(2)])).rejects.toThrow('batch failed');
  });

  it('rejects all items when resolve() returns wrong array length', async () => {
    const batcher = createBatcher({
      resolve: async (keys: number[]) => keys.slice(0, 1), // wrong length
    });

    await expect(Promise.all([batcher.load(1), batcher.load(2)])).rejects.toThrow(/Batcher.*resolve/);
  });

  it('uses window > 0 to coalesce calls across async ticks', async () => {
    vi.useFakeTimers();

    let batchCount = 0;

    const batcher = createBatcher({
      resolve: async (keys: number[]) => {
        batchCount++;

        return keys;
      },
      window: 10,
    });

    const p1 = batcher.load(1);
    const p2 = batcher.load(2);

    vi.advanceTimersByTime(10);

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(batchCount).toBe(1);
    expect(r1).toBe(1);
    expect(r2).toBe(2);

    vi.useRealTimers();
  });

  it('dispose() rejects all queued items and stops any scheduled flush', async () => {
    const batcher = createBatcher({
      resolve: async (keys: number[]) => keys,
    });

    const p1 = batcher.load(1);
    const p2 = batcher.load(2);

    batcher.dispose();

    await expect(p1).rejects.toThrow('[courier] Batcher disposed');
    await expect(p2).rejects.toThrow('[courier] Batcher disposed');
  });

  it('dispose() is safe to call when the queue is empty', () => {
    const batcher = createBatcher({ resolve: async (k: number[]) => k });

    expect(() => batcher.dispose()).not.toThrow();
  });

  it('load() after dispose() rejects immediately without scheduling a flush', async () => {
    const batcher = createBatcher({ resolve: async (keys: number[]) => keys });

    batcher.dispose();

    await expect(batcher.load(1)).rejects.toThrow('[courier] Batcher disposed');
  });

  it('load() after dispose() does not enqueue or schedule anything', async () => {
    let flushCount = 0;

    const batcher = createBatcher({
      resolve: async (keys: number[]) => {
        flushCount++;

        return keys;
      },
    });

    batcher.dispose();

    const p = batcher.load(99).catch(() => {});

    await p;

    expect(flushCount).toBe(0);
  });

  it('dispose() cancels a pending setTimeout flush (window > 0)', async () => {
    vi.useFakeTimers();

    let flushCount = 0;

    const batcher = createBatcher({
      resolve: async (keys: number[]) => {
        flushCount++;

        return keys;
      },
      window: 100,
    });

    // Schedule a flush
    batcher.load(1).catch(() => {});

    // Dispose before the timer fires
    batcher.dispose();

    // Advance past the window — the timer must have been cleared, so no flush
    vi.advanceTimersByTime(200);

    expect(flushCount).toBe(0);

    vi.useRealTimers();
  });
});
