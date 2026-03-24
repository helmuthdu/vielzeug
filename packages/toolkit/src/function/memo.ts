import type { Fn } from '../types';

// #region MemoizeOptions
type MemoizeOptions<T extends Fn> = {
  maxSize?: number; // Maximum number of items in cache
  resolver?: (...args: Parameters<T>) => string; // Custom key generator
  ttl?: number; // Time-to-live in milliseconds
};
// #endregion MemoizeOptions

type CacheEntry<T extends Fn> = {
  timestamp: number;
  value: ReturnType<T>;
};

/**
 * Creates a function that memorizes the result of the provided function.
 * Supports expiration (TTL) and limited cache size (LRU).
 *
 * @example
 * ```ts
 * const add = (x, y) => x + y;
 * const memoizedAdd = memo(add, { ttl: 5000, maxSize: 10 });
 *
 * memoizedAdd(1, 2); // 3 (caches the result)
 * memoizedAdd(1, 2); // 3 (from cache)
 * ```
 *
 * @param fn - The function to memorize.
 * @param options - Memoization options.
 * @param [options.ttl] - (optional) time-to-live (TTL) for cache expiration (in milliseconds).
 * @param [options.maxSize] - (optional) maximum cache size (LRU eviction).
 * @param [options.resolver] - (optional) custom function to resolve the cache key.
 *
 * @returns A new function that memorizes the input function.
 */
export function memo<T extends Fn>(
  fn: T,
  { maxSize, resolver, ttl }: MemoizeOptions<T> = {},
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, CacheEntry<T>>();

  const keyGen = (args: Parameters<T>): string => {
    if (resolver) return resolver(...args);

    // Use a replacer to distinguish undefined from null (JSON.stringify collapses both to null)
    return JSON.stringify(args, (_, v) => (v === undefined ? '__undefined__' : v));
  };

  return (...args: Parameters<T>): ReturnType<T> => {
    const key = keyGen(args);
    const now = Date.now();
    const cached = cache.get(key);

    if (cached && (!ttl || now - cached.timestamp < ttl)) {
      cache.delete(key);
      cache.set(key, cached); // Move to end (most recently used)

      return cached.value;
    }

    const result = fn(...args);

    cache.set(key, { timestamp: now, value: result });

    if (result instanceof Promise) {
      // Evict on rejection so subsequent calls retry instead of returning a settled failure
      (result as Promise<unknown>).catch(() => cache.delete(key));
    }

    if (maxSize && cache.size > maxSize) {
      cache.delete(cache.keys().next().value!); // Remove least recently used
    }

    return result;
  };
}
