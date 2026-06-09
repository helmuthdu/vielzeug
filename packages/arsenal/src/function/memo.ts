import type { Fn } from '../types';

import { LruMap } from '../typed/_lruMap';
import { isPromise } from '../typed/isPromise';

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
  readonly size: number;
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
 * @param [options.ttl] - (optional) time-to-live for cache expiration (ms). `0` disables caching — every call re-executes `fn`.
 * @param [options.maxSize] - (optional) maximum cache size (LRU eviction).
 * @param [options.key] - (optional) custom function to resolve the cache key.
 *
 * @returns A memoized function with `.clear()` and `.invalidate()` methods.
 */
export function memo<T extends Fn>(
  fn: T,
  { key, maxSize = Infinity, ttl = Infinity }: MemoOptions<T> = {},
): Memoized<T> {
  const cache = new LruMap<PropertyKey, CacheEntry<ReturnType<T>>>(maxSize);
  const inFlight = new Set<PropertyKey>();
  const revisions = new Map<PropertyKey, number>();

  const resolveKey = (...args: Parameters<T>): PropertyKey => (key ? key(...args) : defaultKey(args));

  const memoized = (...args: Parameters<T>): ReturnType<T> => {
    const cacheKey = resolveKey(...args);
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      // Move to end (LRU bump) — delete+set handled inside LruMap.set
      cache.set(cacheKey, cached);

      return cached.value;
    }

    const result = fn(...args);
    const entry: CacheEntry<ReturnType<T>> = { expiresAt: now + ttl, value: result as ReturnType<T> };

    cache.set(cacheKey, entry);

    if (isPromise(result)) {
      const rev = (revisions.get(cacheKey) ?? 0) + 1;

      revisions.set(cacheKey, rev);
      inFlight.add(cacheKey);
      void (result as Promise<unknown>)
        .then(() => {
          if (revisions.get(cacheKey) === rev) inFlight.delete(cacheKey);
        })
        .catch(() => {
          if (revisions.get(cacheKey) === rev) {
            inFlight.delete(cacheKey);
            cache.delete(cacheKey);
          }
        });
    }

    // LRU eviction — skip in-flight entries to avoid evicting pending Promises
    while (cache.isOverCapacity) {
      if (!cache.evictOldest((k) => !inFlight.has(k))) break;
    }

    return result as ReturnType<T>;
  };

  const result = Object.assign(memoized, {
    clear: () => {
      cache.clear();
      inFlight.clear();
      revisions.clear();
    },
    invalidate: (...args: Parameters<T>): void => {
      const cacheKey = resolveKey(...args);

      cache.delete(cacheKey);
      inFlight.delete(cacheKey);
      revisions.delete(cacheKey);
    },
  });

  Object.defineProperty(result, 'size', { get: () => cache.size });

  return result as Memoized<T>;
}
