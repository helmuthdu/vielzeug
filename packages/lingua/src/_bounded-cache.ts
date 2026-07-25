// Internal — not part of the public API.
// Minimal bounded cache: evicts the oldest entry (insertion order) once `maxSize` is exceeded.
// Not LRU — no access-time reordering, only insertion order matters. These caches exist purely
// to avoid rebuilding cheap-but-not-free values (compiled `Intl` formatters, scoped translator
// objects) for a bounded number of frequently-reused keys, not to model real recency.

export function getOrCreate<K, V>(cache: Map<K, V>, key: K, maxSize: number, build: () => V): V {
  if (cache.has(key)) return cache.get(key)!;

  const value = build();

  if (cache.size >= maxSize) cache.delete(cache.keys().next().value as K);

  cache.set(key, value);

  return value;
}
