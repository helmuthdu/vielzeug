import { describe, expect, test, vi } from 'vitest';

import { getOrCreate } from '../_bounded-cache';

describe('getOrCreate()', () => {
  test('builds and caches a value on first access', () => {
    const cache = new Map<string, number>();
    const build = vi.fn(() => 42);

    expect(getOrCreate(cache, 'a', 10, build)).toBe(42);
    expect(build).toHaveBeenCalledTimes(1);
  });

  test('returns the cached value on subsequent access without rebuilding', () => {
    const cache = new Map<string, number>();
    const build = vi.fn(() => 42);

    getOrCreate(cache, 'a', 10, build);
    getOrCreate(cache, 'a', 10, build);

    expect(build).toHaveBeenCalledTimes(1);
  });

  test('evicts the oldest entry once maxSize is reached', () => {
    const cache = new Map<string, number>();

    getOrCreate(cache, 'a', 2, () => 1);
    getOrCreate(cache, 'b', 2, () => 2);
    getOrCreate(cache, 'c', 2, () => 3);

    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(true);
    expect(cache.has('c')).toBe(true);
  });

  test('does not evict while under maxSize', () => {
    const cache = new Map<string, number>();

    getOrCreate(cache, 'a', 5, () => 1);
    getOrCreate(cache, 'b', 5, () => 2);

    expect(cache.size).toBe(2);
  });

  test('treats a legitimately cached `undefined` value as a hit, not a miss', () => {
    // Regression test: an earlier version checked `cached !== undefined` instead of
    // `cache.has(key)`, which would rebuild forever for any V that can be undefined.
    const cache = new Map<string, number | undefined>();
    const build = vi.fn(() => undefined);

    getOrCreate(cache, 'a', 10, build);
    getOrCreate(cache, 'a', 10, build);

    expect(build).toHaveBeenCalledTimes(1);
    expect(cache.get('a')).toBeUndefined();
  });
});
