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

  it('should expire entries with ttlMs', () => {
    const c = stash<string>({ hash });

    c.set(['temp'], 'data', { ttlMs: 1000 });

    expect(c.get(['temp'])).toBe('data');
    vi.advanceTimersByTime(1000);
    expect(c.get(['temp'])).toBeUndefined();
  });

  it('should not evict when ttl is Infinity', () => {
    const c = stash<string>({ hash });

    c.set(['k'], 'v', { ttlMs: Number.POSITIVE_INFINITY });
    vi.advanceTimersByTime(1_000_000);
    expect(c.get(['k'])).toBe('v');
  });

  it('should throw for non-finite ttl values except Infinity', () => {
    const c = stash<string>({ hash });

    c.set(['k'], 'v');

    expect(() => c.set(['k2'], 'v', { ttlMs: Number.NaN })).toThrow(TypeError);
    expect(() => c.set(['k3'], 'v', { ttlMs: Number.NEGATIVE_INFINITY })).toThrow(TypeError);
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

  it('getOrSet() caches undefined values — factory is called only once', () => {
    const factory = vi.fn(() => undefined);
    const c = stash<undefined>({ hash });

    c.getOrSet(['k'], factory);
    c.getOrSet(['k'], factory);
    c.getOrSet(['k'], factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(c.get(['k'])).toBeUndefined();
  });

  it('getOrSet() async: caches resolved undefined — factory not called again', async () => {
    let resolve!: (v: undefined) => void;
    const factory = vi.fn(
      () =>
        new Promise<undefined>((r) => {
          resolve = r;
        }),
    );
    const c = stash<undefined>({ hash });

    const p1 = c.getOrSet(['k'], factory);
    const p2 = c.getOrSet(['k'], factory); // in-flight dedup

    expect(factory).toHaveBeenCalledTimes(1);
    resolve(undefined);
    await expect(p1).resolves.toBeUndefined();
    await expect(p2).resolves.toBeUndefined();

    // After resolution, value is cached — factory not called again
    const sync = c.getOrSet(['k'], factory);

    expect(sync).toBeUndefined();
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
