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
});
