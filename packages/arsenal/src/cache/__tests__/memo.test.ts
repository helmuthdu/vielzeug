import { ArsenalError } from '../../errors';
import { memo } from '../memo';

describe('memo', () => {
  it('caches results for the same arguments', () => {
    const mockFn = vi.fn((x: number, y: number) => x + y);
    const memoizedFn = memo(mockFn);

    expect(memoizedFn(1, 2)).toBe(3);
    expect(memoizedFn(1, 2)).toBe(3);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('recomputes for different arguments', () => {
    const mockFn = vi.fn((x: number, y: number) => x + y);
    const memoizedFn = memo(mockFn);

    expect(memoizedFn(1, 2)).toBe(3);
    expect(memoizedFn(2, 3)).toBe(5);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('handles functions with no arguments', () => {
    const mockFn = vi.fn(() => 42);
    const memoizedFn = memo(mockFn);

    expect(memoizedFn()).toBe(42);
    expect(memoizedFn()).toBe(42);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('respects maxSize and evicts the oldest entry (LRU)', () => {
    const mockFn = vi.fn((x: number) => x * 2);
    const memoizedFn = memo(mockFn, { maxSize: 2 });

    expect(memoizedFn(1)).toBe(2);
    expect(memoizedFn(2)).toBe(4);
    expect(memoizedFn(3)).toBe(6); // key 1 evicted

    expect(memoizedFn(1)).toBe(2); // recomputed
    expect(mockFn).toHaveBeenCalledTimes(4);
  });

  it('LRU access bumps entry to most-recently-used', () => {
    const mockFn = vi.fn((x: number) => x * 2);
    const memoizedFn = memo(mockFn, { maxSize: 2 });

    memoizedFn(1); // key 1 (oldest)
    memoizedFn(2); // key 2
    memoizedFn(1); // key 1 bumped to MRU

    memoizedFn(3); // key 2 should now be evicted (oldest)

    expect(mockFn).toHaveBeenCalledTimes(3); // 1, 2, 3 — key 1 still cached
    memoizedFn(1);
    expect(mockFn).toHaveBeenCalledTimes(3); // key 1 still cached

    memoizedFn(2); // key 2 was evicted
    expect(mockFn).toHaveBeenCalledTimes(4);
  });

  it('uses a custom key function', () => {
    const mockFn = vi.fn((obj: { a: number }) => obj.a);
    const memoizedFn = memo(mockFn, { key: (obj: { a: number }) => `obj-${obj.a}` });

    expect(memoizedFn({ a: 1 })).toBe(1);
    expect(memoizedFn({ a: 1 })).toBe(1);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error for non-serializable arguments without a custom key', () => {
    const memoizedFn = memo((value: unknown) => value);
    const circular: { self?: unknown } = {};

    circular.self = circular;

    expect(() => memoizedFn(circular)).toThrow(
      '[arsenal/memo] Failed to serialize memo arguments. Provide options.key for non-serializable arguments. Reason: Converting circular structure to JSON',
    );
  });

  it('supports non-serializable arguments with a custom key', () => {
    const mockFn = vi.fn((value: { id: string; self?: unknown }) => ({ id: value.id }));
    const memoizedFn = memo(mockFn, { key: () => 'singleton' });
    const circular: { id: string; self?: unknown } = { id: 'one' };

    circular.self = circular;

    const first = memoizedFn(circular);

    expect(first).toEqual({ id: 'one' });
    expect(memoizedFn(circular)).toBe(first);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('clear() wipes all cached entries', () => {
    const mockFn = vi.fn((x: number) => x * 2);
    const memoizedFn = memo(mockFn);

    expect(memoizedFn(1)).toBe(2);
    expect(memoizedFn(2)).toBe(4);
    expect(mockFn).toHaveBeenCalledTimes(2);

    memoizedFn.clear();

    expect(memoizedFn(1)).toBe(2);
    expect(memoizedFn(2)).toBe(4);
    expect(mockFn).toHaveBeenCalledTimes(4);
  });

  it('invalidate() removes a specific cached entry', () => {
    const mockFn = vi.fn((x: number) => x * 2);
    const memoizedFn = memo(mockFn);

    expect(memoizedFn(1)).toBe(2);
    expect(memoizedFn(2)).toBe(4);

    memoizedFn.invalidate(1);

    expect(memoizedFn(1)).toBe(2); // recomputed
    expect(memoizedFn(2)).toBe(4); // still cached
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('size reflects the number of cached entries', () => {
    const mockFn = vi.fn((x: number) => x * 2);
    const memoizedFn = memo(mockFn);

    expect(memoizedFn.size).toBe(0);
    memoizedFn(1);
    expect(memoizedFn.size).toBe(1);
    memoizedFn(2);
    expect(memoizedFn.size).toBe(2);
    memoizedFn.invalidate(1);
    expect(memoizedFn.size).toBe(1);
    memoizedFn.clear();
    expect(memoizedFn.size).toBe(0);
  });

  it('size does not exceed maxSize', () => {
    const memoizedFn = memo((x: number) => x, { maxSize: 3 });

    for (let i = 0; i < 10; i++) memoizedFn(i);

    expect(memoizedFn.size).toBeLessThanOrEqual(3);
  });

  it('throws ArsenalError for a non-integer or NaN maxSize — regression for the disabled-eviction bug', () => {
    expect(() => memo((x: number) => x, { maxSize: Number.NaN })).toThrow(ArsenalError);
    expect(() => memo((x: number) => x, { maxSize: -1 })).toThrow(ArsenalError);
    expect(() => memo((x: number) => x, { maxSize: 1.5 })).toThrow(ArsenalError);
  });

  it('accepts Infinity as maxSize (the default, unbounded)', () => {
    expect(() => memo((x: number) => x, { maxSize: Infinity })).not.toThrow();
  });

  it('does not collide NaN, Infinity, null, and functions on the default key — regression for the key-collision bug', () => {
    const mockFn = vi.fn((value: unknown) => value);
    const memoizedFn = memo(mockFn);
    const fnA = () => 'a';
    const fnB = () => 'b';

    memoizedFn(Number.NaN);
    memoizedFn(Number.POSITIVE_INFINITY);
    memoizedFn(Number.NEGATIVE_INFINITY);
    memoizedFn(null);
    memoizedFn(fnA);
    memoizedFn(fnB);

    expect(mockFn).toHaveBeenCalledTimes(6);
    expect(memoizedFn.size).toBe(6);

    // Repeating each call should hit the cache, not recompute.
    memoizedFn(Number.NaN);
    memoizedFn(Number.POSITIVE_INFINITY);
    memoizedFn(Number.NEGATIVE_INFINITY);
    memoizedFn(null);
    memoizedFn(fnA);
    memoizedFn(fnB);
    expect(mockFn).toHaveBeenCalledTimes(6);
  });
});
