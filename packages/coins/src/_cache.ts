/** A FIFO bounded Map cache that evicts the oldest entry when full. */
export function boundedCache<K, V>(maxSize: number): { get(k: K): V | undefined; set(k: K, v: V): void } {
  const map = new Map<K, V>();

  return {
    get: (k) => map.get(k),
    set(k, v) {
      if (map.size >= maxSize) map.delete(map.keys().next().value as K);

      map.set(k, v);
    },
  };
}
