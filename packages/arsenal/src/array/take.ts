/**
 * Takes the first n elements from an array.
 */
export function take<T>(array: T[], n = 1): T[] {
  const count = Math.max(0, Math.floor(n));

  return array.slice(0, count);
}
