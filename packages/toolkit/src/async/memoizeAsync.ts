import type { Fn } from '../types';

type MemoizeAsyncOptions<T extends Fn> = {
  keyResolver?: (...args: Parameters<T>) => PropertyKey;
  maxSize?: number;
  ttl?: number;
};

type CacheEntry<R> = {
  expiresAt: number;
  value: R;
};

/**
 * Memoizes async function results and deduplicates in-flight calls.
 */
export function memoizeAsync<T extends Fn>(
  fn: T,
  { keyResolver, maxSize = Infinity, ttl = Infinity }: MemoizeAsyncOptions<T> = {},
) {
  const cache = new Map<PropertyKey, CacheEntry<Awaited<ReturnType<T>>>>();
  const inFlight = new Map<PropertyKey, Promise<Awaited<ReturnType<T>>>>();

  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = keyResolver ? keyResolver(...args) : JSON.stringify(args);
    const now = Date.now();
    const cached = cache.get(key);

    if (cached && cached.expiresAt > now) {
      return Promise.resolve(cached.value);
    }

    const current = inFlight.get(key);

    if (current) {
      return current;
    }

    const promise = Promise.resolve(fn(...args))
      .then((value) => {
        inFlight.delete(key);
        cache.delete(key);
        cache.set(key, { expiresAt: now + ttl, value });

        while (cache.size > maxSize) {
          const oldestKey = cache.keys().next().value;

          if (oldestKey === undefined) break;

          cache.delete(oldestKey);
        }

        return value;
      })
      .catch((error) => {
        inFlight.delete(key);
        throw error;
      });

    inFlight.set(key, promise);

    return promise;
  };
}
