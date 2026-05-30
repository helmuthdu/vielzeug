/**
 * Typed wrapper for Object.fromEntries.
 */
export function fromEntries<K extends PropertyKey, V>(input: Iterable<readonly [K, V]>): Record<K, V> {
  return Object.fromEntries(input) as Record<K, V>;
}
