/**
 * Returns the first element or fallback when array is empty.
 */
export function first<T>(array: T[], fallback?: T): T | undefined {
  return array.length > 0 ? array[0] : fallback;
}
