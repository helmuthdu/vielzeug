/**
 * Returns the last element or fallback when array is empty.
 */
export function last<T>(array: readonly T[], fallback?: T): T | undefined {
  return array.length > 0 ? array[array.length - 1] : fallback;
}
