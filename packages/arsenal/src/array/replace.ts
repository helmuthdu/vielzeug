import type { Predicate } from '../types';

/**
 * Replaces the first element in an array that satisfies the provided predicate
 * function with a new value.
 *
 * @example
 * ```ts
 * replace([1, 2, 3], (n) => n === 2, 4) // [1, 4, 3]
 * ```
 *
 * @param array - The array to search.
 * @param predicate - A function to test each element of the array.
 * @param value - The new value to replace the found element.
 *
 * @return A new array with the replaced value.
 */
export function replace<T>(array: T[], predicate: Predicate<T>, value: T): T[] {
  const index = array.findIndex(predicate);

  if (index === -1) return array;

  return [...array.slice(0, index), value, ...array.slice(index + 1)];
}
