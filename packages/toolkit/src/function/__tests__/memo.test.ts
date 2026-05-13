import { memo } from '../memo';

describe('memoize', () => {
  it('should cache results for the same arguments', () => {
    const mockFn = vi.fn((x: number, y: number) => x + y);
    const memoizedFn = memo(mockFn);

    expect(memoizedFn(1, 2)).toBe(3);
    expect(memoizedFn(1, 2)).toBe(3);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should not cache results for different arguments', () => {
    const mockFn = vi.fn((x: number, y: number) => x + y);
    const memoizedFn = memo(mockFn);

    expect(memoizedFn(1, 2)).toBe(3);
    expect(memoizedFn(2, 3)).toBe(5);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should respect the TTL and evict expired cache entries', () => {
    vi.useFakeTimers();

    const mockFn = vi.fn((x: number) => x * 2);
    const memoizedFn = memo(mockFn, { ttl: 1000 });

    expect(memoizedFn(2)).toBe(4);
    expect(memoizedFn(2)).toBe(4);
    expect(mockFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(memoizedFn(2)).toBe(4);
    expect(mockFn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('should respect the maxSize and evict the oldest cache entries', () => {
    const mockFn = vi.fn((x: number) => x * 2);
    const memoizedFn = memo(mockFn, { maxSize: 2 });

    expect(memoizedFn(1)).toBe(2);
    expect(memoizedFn(2)).toBe(4);
    expect(memoizedFn(3)).toBe(6);

    // Oldest entry (1) should be evicted
    expect(memoizedFn(1)).toBe(2);
    expect(mockFn).toHaveBeenCalledTimes(4);
  });

  it('should handle functions with no arguments', () => {
    const mockFn = vi.fn(() => 42);
    const memoizedFn = memo(mockFn);

    expect(memoizedFn()).toBe(42);
    expect(memoizedFn()).toBe(42);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should use contentHash resolver', () => {
    const mockFn = vi.fn((obj: { a: number }) => obj.a);
    const memoizedFn = memo(mockFn, { key: (obj: { a: number }) => `obj-${obj.a}` });

    expect(memoizedFn({ a: 1 })).toBe(1);
    expect(memoizedFn({ a: 1 })).toBe(1);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('deduplicates in-flight async calls', async () => {
    const mockFn = vi.fn(async (value: number) => value * 3);
    const memoizedFn = memo(mockFn);

    const [first, second] = await Promise.all([memoizedFn(2), memoizedFn(2)]);

    expect(first).toBe(6);
    expect(second).toBe(6);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('evicts rejected async results', async () => {
    const mockFn = vi
      .fn<(...args: [number]) => Promise<number>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(9);
    const memoizedFn = memo(mockFn);

    await expect(memoizedFn(3)).rejects.toThrow('boom');
    await expect(memoizedFn(3)).resolves.toBe(9);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error for non-serializable arguments without a custom key', () => {
    const memoizedFn = memo((value: unknown) => value);
    const circular: { self?: unknown } = {};

    circular.self = circular;

    expect(() => memoizedFn(circular)).toThrow(
      '[toolkit/memo] Failed to serialize memo arguments. Provide options.key for non-serializable arguments. Reason: Converting circular structure to JSON',
    );
  });

  it('supports non-serializable arguments with a custom key', () => {
    const mockFn = vi.fn((value: { id: string; self?: unknown }) => ({ id: value.id }));
    const memoizedFn = memo(mockFn, { key: () => 'singleton' });
    const circular: { id: string; self?: unknown } = { id: 'one' };

    circular.self = circular;

    const first = memoizedFn(circular);
    const second = memoizedFn(circular);

    expect(first).toEqual({ id: 'one' });
    expect(second).toBe(first);
    expect(mockFn).toHaveBeenCalledTimes(1);

    const anotherCircular: { id: string; self?: unknown } = { id: 'two' };

    anotherCircular.self = anotherCircular;

    // A constant key intentionally aliases all inputs to the same cached result.
    expect(memoizedFn(anotherCircular)).toBe(first);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
