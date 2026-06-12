/**
 * A Map subclass that evicts the oldest non-excluded entry when the map exceeds
 * `maxSize`. Iteration order (insertion order) determines LRU — the first key
 * returned by `keys()` is the oldest.
 *
 * Calling `set` on an existing key refreshes its position (move-to-end).
 *
 * Module-private: underscore-prefixed file is excluded from barrel exports.
 */
export class LruMap<K, V> extends Map<K, V> {
  readonly maxSize: number;

  constructor(maxSize: number) {
    super();
    this.maxSize = maxSize;
  }

  override set(key: K, value: V): this {
    // Move existing entry to the end (most-recently-used position)
    if (this.has(key)) this.delete(key);

    super.set(key, value);

    return this;
  }

  /**
   * Evicts the oldest entry for which `canEvict` returns true.
   * Returns `true` if an entry was evicted, `false` if all entries are guarded.
   */
  evictOldest(canEvict: (key: K, value: V) => boolean = () => true): boolean {
    for (const [k, v] of this) {
      if (canEvict(k, v)) {
        this.delete(k);

        return true;
      }
    }

    return false;
  }

  /**
   * Returns `true` when the map holds more entries than `maxSize`.
   * Intentionally uses `>` not `>=`: the entry is added first, then this
   * getter signals that eviction should run to bring the map back to `maxSize`.
   */
  get isOverCapacity(): boolean {
    return this.size > this.maxSize;
  }
}
