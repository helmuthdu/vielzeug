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

export type Memoized<T extends Fn> = ((...args: Parameters<T>) => ReturnType<T>) & {
  clear(): void;
  invalidate(...args: Parameters<T>): void;
};

const UNDEFINED_SENTINEL = '\x00undefined\x00';

const defaultKey = (args: unknown[]): string => {
  try {
    return JSON.stringify(args, (_, value) => (value === undefined ? UNDEFINED_SENTINEL : value));
  } catch (error) {
    const reason = error instanceof Error && error.message ? ` Reason: ${error.message}` : '';

    throw new TypeError(
      `[arsenal/memo] Failed to serialize memo arguments. Provide options.key for non-serializable arguments.${reason}`,
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
 * The returned function exposes `.clear()` and `.invalidate(...args)` methods.
 *
 * @example
 * ```ts
 * const add = (x, y) => x + y;
 * const memoizedAdd = memo(add, { ttl: 5000, maxSize: 10 });
 *
 * memoizedAdd(1, 2); // 3 (caches the result)
 * memoizedAdd(1, 2); // 3 (from cache)
 * memoizedAdd.invalidate(1, 2); // remove specific entry
 * memoizedAdd.clear(); // wipe entire cache
 * ```
 *
 * @param fn - The function to memorize.
 * @param options - Memoization options.
 * @param [options.ttl] - (optional) time-to-live for cache expiration (ms).
 * @param [options.maxSize] - (optional) maximum cache size (LRU eviction).
 * @param [options.key] - (optional) custom function to resolve the cache key.
 *
 * @returns A memoized function with `.clear()` and `.invalidate()` methods.
 */
export function memo<T extends Fn>(
  fn: T,
  { key, maxSize = Infinity, ttl = Infinity }: MemoOptions<T> = {},
): Memoized<T> {
  const cache = new Map<PropertyKey, CacheEntry<ReturnType<T>>>();
  const inFlight = new Set<PropertyKey>();

  const resolveKey = (...args: Parameters<T>): PropertyKey => (key ? key(...args) : defaultKey(args));

  const memoized = (...args: Parameters<T>): ReturnType<T> => {
    const cacheKey = resolveKey(...args);
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
      inFlight.add(cacheKey);
      void (result as Promise<unknown>)
        .then(() => inFlight.delete(cacheKey))
        .catch(() => {
          inFlight.delete(cacheKey);
          cache.delete(cacheKey);
        });
    }

    // LRU eviction — skip in-flight entries to avoid evicting pending Promises
    while (cache.size > maxSize) {
      let evicted = false;

      for (const oldestKey of cache.keys()) {
        if (!inFlight.has(oldestKey)) {
          cache.delete(oldestKey);
          evicted = true;
          break;
        }
      }

      if (!evicted) break; // all remaining entries are in-flight
    }

    return result as ReturnType<T>;
  };

  return Object.assign(memoized, {
    clear: () => {
      cache.clear();
      inFlight.clear();
    },
    invalidate: (...args: Parameters<T>): void => {
      cache.delete(resolveKey(...args));
    },
  });
}
