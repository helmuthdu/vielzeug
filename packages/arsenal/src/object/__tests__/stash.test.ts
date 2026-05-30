import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stash } from '../stash';

const hash = (key: readonly unknown[]) => JSON.stringify(key);

describe('stash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should store and retrieve values', () => {
    const c = stash<string>({ hash });

    c.set(['user', 1], 'Alice');
    expect(c.get(['user', 1])).toBe('Alice');
  });

  it('should return undefined for missing keys', () => {
    const c = stash<string>({ hash });

    expect(c.get(['missing'])).toBeUndefined();
  });

  it('should delete values', () => {
    const c = stash<number>({ hash });

    c.set(['count'], 42);
    expect(c.delete(['count'])).toBe(true);
    expect(c.get(['count'])).toBeUndefined();
  });

  it('should return false when deleting non-existent key', () => {
    const c = stash<string>({ hash });

    expect(c.delete(['nonexistent'])).toBe(false);
  });

  it('should clear all values', () => {
    const c = stash<string>({ hash });

    c.set(['a'], 'A');
    c.set(['b'], 'B');
    expect(c.size()).toBe(2);
    c.clear();
    expect(c.size()).toBe(0);
  });

  it('should track cache size', () => {
    const c = stash<number>({ hash });

    expect(c.size()).toBe(0);
    c.set(['one'], 1);
    c.set(['two'], 2);
    expect(c.size()).toBe(2);
  });

  it('should schedule garbage collection', () => {
    const c = stash<string>({ hash });

    c.set(['temp'], 'data');
    c.scheduleGc(['temp'], 1000);

    expect(c.get(['temp'])).toBe('data');
    vi.advanceTimersByTime(1000);
    expect(c.get(['temp'])).toBeUndefined();
  });

  it('should cancel previous GC when scheduling new one', () => {
    const c = stash<string>({ hash });

    c.set(['item'], 'value');

    c.scheduleGc(['item'], 500);
    vi.advanceTimersByTime(300);
    c.scheduleGc(['item'], 1000); // Reschedule

    vi.advanceTimersByTime(500);
    expect(c.get(['item'])).toBe('value'); // Still exists

    vi.advanceTimersByTime(500);
    expect(c.get(['item'])).toBeUndefined(); // Now deleted
  });

  it('should store and retrieve metadata', () => {
    const c = stash<string, readonly unknown[], { role: string }>({ hash });

    c.set(['user', 1], 'Alice', { meta: { role: 'admin' } });

    const meta = c.getEntry(['user', 1])?.meta;

    expect(meta).toEqual({ role: 'admin' });
  });

  it('set() can update metadata and clear it with undefined', () => {
    const c = stash<string, readonly unknown[], { ttlLabel?: string }>({ hash });

    c.set(['k'], 'v1', { meta: { ttlLabel: 'short' } });
    expect(c.getEntry(['k'])?.meta).toEqual({ ttlLabel: 'short' });

    c.set(['k'], 'v2', { meta: undefined });
    expect(c.getEntry(['k'])?.meta).toBeUndefined();
  });

  it('should clear GC timers on clear', () => {
    const c = stash<string>({ hash });

    c.set(['a'], 'A');
    c.scheduleGc(['a'], 5000);
    c.clear();
    vi.advanceTimersByTime(5000);
    expect(c.get(['a'])).toBeUndefined();
  });

  it('should handle complex keys', () => {
    const c = stash<string>({ hash });
    const key = ['user', { id: 1, role: 'admin' }, [1, 2, 3]];

    c.set(key, 'complex');
    expect(c.get(key)).toBe('complex');
  });

  it('should support a custom hash function', () => {
    const c = stash<string, readonly unknown[]>({
      hash: (key) => `${String(key[0])}:${String(key[1])}`,
    });

    c.set(['user', 1], 'Alice');
    expect(c.get(['user', 1])).toBe('Alice');
  });

  it('should support getOrSet()', () => {
    const c = stash<number>({ hash });

    const first = c.getOrSet(['k'], () => 1);
    const second = c.getOrSet(['k'], () => 2);

    expect(first).toBe(1);
    expect(second).toBe(1);
    expect(c.get(['k'])).toBe(1);
  });

  it('getOrSet() should not recompute when cached value is undefined', () => {
    const c = stash<undefined | string>({ hash });
    const factory = vi.fn<() => undefined>(() => undefined);

    const first = c.getOrSet(['k'], factory);
    const second = c.getOrSet(['k'], factory);

    expect(first).toBeUndefined();
    expect(second).toBeUndefined();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(c.getEntry(['k'])).toEqual({ meta: undefined, value: undefined });
  });

  it('touch() should return false for missing keys', () => {
    const c = stash<string>({ hash });

    expect(c.touch(['missing'], 100)).toBe(false);
  });

  it('touch() should refresh ttl for existing keys', () => {
    const c = stash<string>({ hash });

    c.set(['k'], 'v', { ttlMs: 500 });
    vi.advanceTimersByTime(300);
    expect(c.touch(['k'], 1000)).toBe(true);

    vi.advanceTimersByTime(500);
    expect(c.get(['k'])).toBe('v');

    vi.advanceTimersByTime(600);
    expect(c.get(['k'])).toBeUndefined();
  });

  it('should not evict when ttl is Infinity', () => {
    const c = stash<string>({ hash });

    c.set(['k'], 'v', { ttlMs: Number.POSITIVE_INFINITY });
    vi.advanceTimersByTime(1_000_000);
    expect(c.get(['k'])).toBe('v');
  });

  it('should throw for non-finite ttl values except Infinity', () => {
    const c = stash<string>({ hash });
    const seeded = c.getOrSet(['k'], () => 'v');

    expect(seeded).toBe('v');

    expect(() => c.scheduleGc(['k'], Number.NaN)).toThrow(TypeError);
    expect(() => c.scheduleGc(['k'], Number.NEGATIVE_INFINITY)).toThrow(TypeError);
  });

  it('should expose entries() iterator', () => {
    const c = stash<number>({ hash });

    c.set(['a'], 1);
    c.set(['b'], 2);

    expect(Array.from(c.entries())).toEqual([
      [['a'], 1],
      [['b'], 2],
    ]);
  });

  it('getOrSet() supports async factories and prevents stampedes', async () => {
    let resolveFactory!: (v: string) => void;
    const factory = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolveFactory = r;
        }),
    );
    const c = stash<string>({ hash });

    const p1 = c.getOrSet(['k'], factory);
    const p2 = c.getOrSet(['k'], factory); // concurrent call — same in-flight

    expect(factory).toHaveBeenCalledTimes(1); // factory only called once

    resolveFactory('hello');
    await expect(p1).resolves.toBe('hello');
    await expect(p2).resolves.toBe('hello');

    // After resolution, the value is cached
    expect(c.get(['k'])).toBe('hello');
  });

  it('getOrSet() removes in-flight entry on rejection', async () => {
    let rejectFactory!: (err: Error) => void;
    const factory = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<string>((_, reject) => {
            rejectFactory = reject;
          }),
      )
      .mockResolvedValueOnce('ok');

    const c = stash<string>({ hash });

    const p1 = c.getOrSet(['k'], factory);

    rejectFactory(new Error('fail'));
    await expect(p1).rejects.toThrow('fail');

    // Key should be gone, next call retries
    const p2 = c.getOrSet(['k'], factory);

    await expect(p2).resolves.toBe('ok');
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('onEvict callback fires when a key is explicitly deleted', () => {
    const onEvict = vi.fn();
    const c = stash<string, readonly unknown[]>({ hash, onEvict });

    c.set(['k'], 'value');
    c.delete(['k']);

    expect(onEvict).toHaveBeenCalledWith(['k'], 'value');
  });

  it('onEvict callback fires on GC expiry', () => {
    const onEvict = vi.fn();
    const c = stash<number, readonly unknown[]>({ hash, onEvict });

    c.set(['n'], 42, { ttlMs: 500 });
    vi.advanceTimersByTime(500);

    expect(onEvict).toHaveBeenCalledWith(['n'], 42);
  });

  it('onEvict callback fires for each entry on clear()', () => {
    const onEvict = vi.fn();
    const c = stash<string, readonly unknown[]>({ hash, onEvict });

    c.set(['a'], 'A');
    c.set(['b'], 'B');
    c.clear();

    expect(onEvict).toHaveBeenCalledTimes(2);
  });
});
