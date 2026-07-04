import type { Fn } from '../types';

import { LruMap } from '../_common/_lruMap';
import { ArsenalSerializationError, ArsenalValidationError } from '../errors';

export type MemoOptions<T extends Fn> = {
  key?: (...args: Parameters<T>) => PropertyKey;
  maxSize?: number;
};

export type Memoized<T extends Fn> = ((...args: Parameters<T>) => ReturnType<T>) & {
  clear(): void;
  invalidate(...args: Parameters<T>): void;
  readonly size: number;
};

const UNDEFINED_SENTINEL = '\x00undefined\x00';
const NAN_SENTINEL = '\x00NaN\x00';
const POSITIVE_INFINITY_SENTINEL = '\x00+Infinity\x00';
const NEGATIVE_INFINITY_SENTINEL = '\x00-Infinity\x00';
const FUNCTION_SENTINEL = '\x00function\x00';

let functionIdCounter = 0;
const functionIds = new WeakMap<Fn, number>();

/** Returns a stable per-identity id for a function so distinct functions never collide as cache keys. */
function idForFunction(fn: Fn): number {
  let id = functionIds.get(fn);

  if (id === undefined) {
    id = functionIdCounter++;
    functionIds.set(fn, id);
  }

  return id;
}

const defaultKey = (args: unknown[]): string => {
  try {
    return JSON.stringify(args, (_, value) => {
      if (value === undefined) return UNDEFINED_SENTINEL;

      if (typeof value === 'number' && Number.isNaN(value)) return NAN_SENTINEL;

      if (value === Number.POSITIVE_INFINITY) return POSITIVE_INFINITY_SENTINEL;

      if (value === Number.NEGATIVE_INFINITY) return NEGATIVE_INFINITY_SENTINEL;

      if (typeof value === 'function') return `${FUNCTION_SENTINEL}${idForFunction(value as Fn)}`;

      return value;
    });
  } catch (error) {
    const reason = error instanceof Error && error.message ? ` Reason: ${error.message}` : '';

    throw new ArsenalSerializationError(
      `[arsenal/memo] Failed to serialize memo arguments. Provide options.key for non-serializable arguments.${reason}`,
      { cause: error },
    );
  }
};

/** Excludes async functions at the type level so callers cannot accidentally memoize a Promise. */
type SyncFn<T extends Fn> = ReturnType<T> extends Promise<unknown> ? never : T;

/**
 * Memoizes a **sync** function with optional LRU eviction by cache size.
 * The returned function exposes `.clear()` and `.invalidate(...args)` methods.
 *
 * **Do not pass async functions.** `memo` caches the raw `Promise` object, not
 * the resolved value — subsequent calls return the same stale Promise. Use
 * `stash.getOrSet` for async caching with TTL and stampede prevention.
 *
 * @example
 * ```ts
 * const add = (x: number, y: number) => x + y;
 * const memoAdd = memo(add, { maxSize: 100 });
 *
 * memoAdd(1, 2); // 3 (computed)
 * memoAdd(1, 2); // 3 (from cache)
 * memoAdd.invalidate(1, 2); // remove specific entry
 * memoAdd.clear(); // wipe entire cache
 * ```
 *
 * @param fn - The sync function to memoize. Must not return a Promise.
 * @param [options.maxSize] - Maximum cache size. Oldest entries evicted when exceeded (LRU). Default: `Infinity`.
 * @param [options.key] - Custom cache key function. Defaults to `JSON.stringify(args)`.
 *
 * @throws {ArsenalValidationError} If `maxSize` is not a positive integer or `Infinity`.
 */
export function memo<T extends Fn>(fn: SyncFn<T>, { key, maxSize = Infinity }: MemoOptions<T> = {}): Memoized<T> {
  if (maxSize !== Infinity && (!Number.isInteger(maxSize) || maxSize < 1)) {
    throw new ArsenalValidationError(`memo: maxSize must be a positive integer or Infinity, got ${maxSize}`);
  }

  const cache = new LruMap<PropertyKey, ReturnType<T>>(maxSize);

  const resolveKey = (...args: Parameters<T>): PropertyKey => (key ? key(...args) : defaultKey(args));

  const memoized = (...args: Parameters<T>): ReturnType<T> => {
    const cacheKey = resolveKey(...args);

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;

      cache.set(cacheKey, cached);

      return cached;
    }

    const value = fn(...args) as ReturnType<T>;

    cache.set(cacheKey, value);

    return value;
  };

  const result = Object.assign(memoized, {
    clear: () => cache.clear(),
    invalidate: (...args: Parameters<T>): void => {
      cache.delete(resolveKey(...args));
    },
  });

  Object.defineProperty(result, 'size', { get: () => cache.size });

  return result as Memoized<T>;
}
