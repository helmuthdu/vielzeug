/**
 * Returns the cached value for `key` from `cache`, creating and storing it via
 * `build()` on the first access. Subsequent accesses return the cached instance.
 *
 * Useful for lazy-initializing expensive objects (e.g. `Intl` formatters) keyed by string.
 *
 * @example
 * ```ts
 * const cache = new Map<string, Intl.NumberFormat>();
 * const fmt = getOrCreate(cache, 'en-US', () => new Intl.NumberFormat('en-US'));
 * ```
 *
 * @param cache - The `Map` acting as the cache store.
 * @param key   - The cache key.
 * @param build - Factory invoked once to create the value when the key is absent.
 * @returns The cached (or newly created) value.
 */
export function getOrCreate<K, V>(cache: Map<K, V>, key: K, build: () => V): V {
  let value = cache.get(key);

  if (value === undefined && !cache.has(key)) {
    value = build();
    cache.set(key, value);
  }

  return value as V;
}
