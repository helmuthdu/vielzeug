/**
 * Creates a simple bounded FIFO cache backed by a `Map`.
 * When the cache is at capacity, the oldest entry is evicted before inserting the new one.
 * Prevents unbounded memory growth in long-running applications.
 *
 * @example
 * ```ts
 * const cache = cache<string, Intl.NumberFormat>(64);
 * const fmt = cache.get('en-US') ?? (() => {
 *   const f = new Intl.NumberFormat('en-US');
 *   cache.set('en-US', f);
 *   return f;
 * })();
 * ```
 *
 * @param maxSize - Maximum number of entries before eviction occurs.
 * @returns A cache object with `get` and `set` methods.
 */
export function cache<K, V>(maxSize: number): { get(key: K): V | undefined; set(key: K, value: V): void } {
  const map = new Map<K, V>();

  return {
    get(key: K): V | undefined {
      return map.get(key);
    },

    set(key: K, value: V): void {
      if (map.size >= maxSize) {
        const [firstKey] = map.keys();

        if (firstKey !== undefined) map.delete(firstKey);
      }

      map.set(key, value);
    },
  };
}
