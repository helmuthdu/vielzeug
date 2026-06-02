/**
 * Returns a function that always returns the same value.
 */
export function constant<T>(value: T): () => T {
  return () => value;
}
