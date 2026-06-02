/**
 * Returns the last element or fallback when array is empty.
 */
export function last<T>(array: T[], fallback?: T): T | undefined {
  return array.length > 0 ? array[array.length - 1] : fallback;
}
