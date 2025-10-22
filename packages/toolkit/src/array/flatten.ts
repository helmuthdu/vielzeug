/**
 * Flattens a nested array into a single-level array.
 *
 * @example
 * ```ts
 * const arr = [1, [2, [3, [4, [5]]]]];
 * flatten(arr) // [1, 2, 3, 4, 5];
 * ```
 *
 * @param array - The array to flatten.
 *
 * @returns A single-level array.
 */
export function flatten<T>(array: T[]) {
  return array.flat(Number.POSITIVE_INFINITY);
}
