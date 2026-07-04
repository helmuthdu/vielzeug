import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArsenalError } from '../../errors';
import { stash } from '../stash';

const hash = (key: readonly unknown[]) => JSON.stringify(key);

describe('stash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('works with string keys and no options (default hash)', () => {
    const c = stash<string>();

    c.set('user:1', 'Alice');
    expect(c.get('user:1')).toBe('Alice');
    expect(c.get('user:2')).toBeUndefined();
  });

  it('should store and retrieve values', () => {
    const c = stash<string, readonly unknown[]>({ hash });

    c.set(['user', 1], 'Alice');
    expect(c.get(['user', 1])).toBe('Alice');
  });

  it('should return undefined for missing keys', () => {
    const c = stash<string, readonly unknown[]>({ hash });

    expect(c.get(['missing'])).toBeUndefined();
  });

  it('should delete values', () => {
    const c = stash<number, readonly unknown[]>({ hash });

    c.set(['count'], 42);
    expect(c.delete(['count'])).toBe(true);
    expect(c.get(['count'])).toBeUndefined();
  });

  it('should return false when deleting non-existent key', () => {
    const c = stash<string, readonly unknown[]>({ hash });

    expect(c.delete(['nonexistent'])).toBe(false);
  });

  it('should clear all values', () => {
    const c = stash<string, readonly unknown[]>({ hash });

    c.set(['a'], 'A');
    c.set(['b'], 'B');
    expect(c.size).toBe(2);
    c.clear();
    expect(c.size).toBe(0);
  });

  it('should track cache size', () => {
    const c = stash<number, readonly unknown[]>({ hash });

    expect(c.size).toBe(0);
    c.set(['one'], 1);
    c.set(['two'], 2);
    expect(c.size).toBe(2);
  });

  it('should expire entries with per-set ttlMs', () => {
    const c = stash<string, readonly unknown[]>({ hash });

    c.set(['temp'], 'data', { ttlMs: 1000 });

    expect(c.get(['temp'])).toBe('data');
    vi.advanceTimersByTime(1000);
    expect(c.get(['temp'])).toBeUndefined();
  });

  it('applies global ttlMs from constructor to all entries', () => {
    const c = stash<string, readonly unknown[]>({ hash, ttlMs: 500 });

    c.set(['a'], 'A');
    c.set(['b'], 'B');
    expect(c.get(['a'])).toBe('A');
    vi.advanceTimersByTime(500);
    expect(c.get(['a'])).toBeUndefined();
    expect(c.get(['b'])).toBeUndefined();
  });

  it('per-set ttlMs overrides global ttlMs', () => {
    const c = stash<string, readonly unknown[]>({ hash, ttlMs: 1000 });

    c.set(['short'], 'x', { ttlMs: 200 });
    c.set(['long'], 'y', { ttlMs: 2000 });
    vi.advanceTimersByTime(500);
    expect(c.get(['short'])).toBeUndefined();
    expect(c.get(['long'])).toBe('y');
  });

  it('should not evict when ttl is Infinity', () => {
    const c = stash<string, readonly unknown[]>({ hash });

    c.set(['k'], 'v', { ttlMs: Number.POSITIVE_INFINITY });
    vi.advanceTimersByTime(1_000_000);
    expect(c.get(['k'])).toBe('v');
  });

  it('should throw for non-finite ttl values except Infinity', () => {
    const c = stash<string, readonly unknown[]>({ hash });

    c.set(['k'], 'v');

    expect(() => c.set(['k2'], 'v', { ttlMs: Number.NaN })).toThrow(ArsenalError);
    expect(() => c.set(['k3'], 'v', { ttlMs: Number.NEGATIVE_INFINITY })).toThrow(ArsenalError);
  });

  it('throws ArsenalError for a non-integer or NaN maxSize — regression for the disabled-eviction bug', () => {
    expect(() => stash({ maxSize: Number.NaN })).toThrow(ArsenalError);
    expect(() => stash({ maxSize: -1 })).toThrow(ArsenalError);
    expect(() => stash({ maxSize: 1.5 })).toThrow(ArsenalError);
  });

  it('accepts Infinity as maxSize (the default, unbounded)', () => {
    expect(() => stash({ maxSize: Infinity })).not.toThrow();
  });

  it('evicts the oldest entry (FIFO) once maxSize is exceeded', () => {
    const c = stash<string, readonly unknown[]>({ hash, maxSize: 2 });

    c.set(['a'], 'A');
    c.set(['b'], 'B');
    c.set(['c'], 'C'); // evicts 'a' (oldest)

    expect(c.size).toBe(2);
    expect(c.get(['a'])).toBeUndefined();
    expect(c.get(['b'])).toBe('B');
    expect(c.get(['c'])).toBe('C');
  });

  it('should handle complex keys', () => {
    const c = stash<string, readonly unknown[]>({ hash });
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
    const c = stash<number, readonly unknown[]>({ hash });

    const first = c.getOrSet(['k'], () => 1);
    const second = c.getOrSet(['k'], () => 2);

    expect(first).toBe(1);
    expect(second).toBe(1);
    expect(c.get(['k'])).toBe(1);
  });

  it('should expose entries() iterator', () => {
    const c = stash<number, readonly unknown[]>({ hash });

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
    const c = stash<string, readonly unknown[]>({ hash });

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

    const c = stash<string, readonly unknown[]>({ hash });

    const p1 = c.getOrSet(['k'], factory);

    rejectFactory(new Error('fail'));
    await expect(p1).rejects.toThrow('fail');

    // Key should be gone, next call retries
    const p2 = c.getOrSet(['k'], factory);

    await expect(p2).resolves.toBe('ok');
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('forceRefresh alongside an in-flight request does not corrupt the in-flight map for a third caller — regression', async () => {
    vi.useRealTimers();

    let resolveFirst!: (v: string) => void;
    let resolveSecond!: (v: string) => void;
    const c = stash<string>({ hash: (k) => k });

    const firstFactory = vi.fn(() => new Promise<string>((r) => (resolveFirst = r)));
    const p1 = c.getOrSet('k', firstFactory); // starts the first in-flight fetch

    const secondFactory = vi.fn(() => new Promise<string>((r) => (resolveSecond = r)));
    const p2 = c.getOrSet('k', secondFactory, { forceRefresh: true }); // overlapping forceRefresh, tracked in-flight

    // Deleting the key while both are in flight suppresses the first request's cache write on
    // resolution (`deletedWhileInFlight`) — isolating the in-flight-map bug from the separate,
    // already-documented "last .then wins the store write" caveat.
    c.delete('k');

    // The first (older) in-flight request settles first. With the corrupted in-flight map,
    // its `.then` would unconditionally delete whatever is *currently* tracked for this key
    // — i.e. `p2`'s still-pending entry — even though `p2` isn't done yet, and even though it
    // didn't write anything to the store (suppressed by the delete above).
    resolveFirst('stale');
    await p1;

    // A third caller, right after the first request settles but before the second one does,
    // must still join the second (still in-flight) request instead of starting a brand new
    // factory call.
    const thirdFactory = vi.fn(() => Promise.resolve('third'));
    const p3 = c.getOrSet('k', thirdFactory);

    expect(thirdFactory).not.toHaveBeenCalled();
    expect(p3).toBe(p2);

    resolveSecond('fresh');
    await expect(p2).resolves.toBe('fresh');
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
    const c = stash<undefined, readonly unknown[]>({ hash });

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
    const c = stash<undefined, readonly unknown[]>({ hash });

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

  it('clear() during in-flight does not re-populate the store after the promise resolves', async () => {
    vi.useRealTimers();

    let resolve!: (v: string) => void;
    const c = stash<string>({ hash: (k: string) => k });
    const factory = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        }),
    );

    const p = c.getOrSet('key', factory);

    expect(c.size).toBe(0); // not yet resolved

    c.clear(); // clear before resolve

    resolve('hello');
    await p; // promise still resolves for caller

    // Store must remain empty — clear() happened before resolve
    expect(c.size).toBe(0);
    expect(c.get('key')).toBeUndefined();
  });

  it('delete() during in-flight does not re-populate the store after the promise resolves', async () => {
    vi.useRealTimers();

    let resolve!: (v: string) => void;
    const c = stash<string>({ hash: (k: string) => k });
    const factory = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        }),
    );

    const p = c.getOrSet('key', factory);

    expect(c.size).toBe(0);

    c.delete('key'); // delete before in-flight resolves

    resolve('hello');

    const value = await p; // caller still receives the resolved value

    expect(value).toBe('hello');
    expect(c.size).toBe(0); // must NOT be re-added to store
    expect(c.get('key')).toBeUndefined();
  });

  it('getOrSet() sync: caches undefined — factory not called again', () => {
    const factory = vi.fn(() => undefined as undefined);
    const c = stash<undefined, string>({ hash: (k) => k });

    const v1 = c.getOrSet('k', factory);

    expect(v1).toBeUndefined();
    expect(factory).toHaveBeenCalledTimes(1);

    const v2 = c.getOrSet('k', factory);

    expect(v2).toBeUndefined();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  describe('persistence hooks', () => {
    const persistence = {
      deserialize: (raw: string) => JSON.parse(raw) as { n: number },
      serialize: (v: { n: number }) => JSON.stringify(v),
    };

    it('get() deserializes stored value', () => {
      const c = stash<{ n: number }>({ hash: (k) => k, persistence });

      c.set('a', { n: 42 });

      expect(c.get('a')).toEqual({ n: 42 });
    });

    it('entries() deserializes all values', () => {
      const c = stash<{ n: number }>({ hash: (k) => k, persistence });

      c.set('a', { n: 1 });
      c.set('b', { n: 2 });

      const entries = [...c.entries()];

      expect(entries).toContainEqual(['a', { n: 1 }]);
      expect(entries).toContainEqual(['b', { n: 2 }]);
    });

    it('getOrSet (cached hit) returns deserialized value', () => {
      const c = stash<{ n: number }>({ hash: (k) => k, persistence });

      c.set('a', { n: 99 });

      const result = c.getOrSet('a', () => ({ n: 0 }));

      expect(result).toEqual({ n: 99 });
    });
  });
});
