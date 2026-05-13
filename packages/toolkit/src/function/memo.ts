import type { Fn } from '../types';

type MemoOptions<T extends Fn> = {
  key?: (...args: Parameters<T>) => PropertyKey;
  maxSize?: number;
  ttl?: number;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const defaultKey = (args: unknown[]): string => {
  try {
    return JSON.stringify(args, (_, value) => (value === undefined ? '__undefined__' : value));
  } catch (error) {
    const reason = error instanceof Error && error.message ? ` Reason: ${error.message}` : '';

    throw new TypeError(
      `[toolkit/memo] Failed to serialize memo arguments. Provide options.key for non-serializable arguments.${reason}`,
      { cause: error },
    );
  }
};

const isPromise = (value: unknown): value is Promise<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  'then' in value &&
  typeof (value as Promise<unknown>).then === 'function';

/**
 * Creates a function that memoizes the result of the provided function.
 * Supports sync and async functions, including in-flight deduplication for async calls.
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
 * @param [options.key] - (optional) custom function to resolve the cache key.
 *
 * @returns A new function that memorizes the input function.
 */
export function memo<T extends Fn>(
  fn: T,
  { key, maxSize = Infinity, ttl = Infinity }: MemoOptions<T> = {},
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<PropertyKey, CacheEntry<ReturnType<T>>>();

  return (...args: Parameters<T>): ReturnType<T> => {
    const cacheKey = key ? key(...args) : defaultKey(args);
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      cache.delete(cacheKey);
      cache.set(cacheKey, cached);

      return cached.value;
    }

    const result = fn(...args);
    const entry: CacheEntry<ReturnType<T>> = { expiresAt: now + ttl, value: result as ReturnType<T> };

    cache.delete(cacheKey);
    cache.set(cacheKey, entry);

    if (isPromise(result)) {
      // Evict on rejection so subsequent calls retry instead of returning a settled failure
      void result.catch(() => cache.delete(cacheKey));
    }

    while (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value;

      if (oldestKey === undefined) {
        break;
      }

      cache.delete(oldestKey);
    }

    return result as ReturnType<T>;
  };
}
