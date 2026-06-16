import { isEqual } from '../guards/isEqual';

/**
 * Checks if a value is present in an array.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, { a: 1 }, 'hello'];
 * const value = { a: 1 };
 * contains(arr, value) // true;
 * ```
 *
 * @param array - The array to check.
 * @param value - The value to search for.
 *
 * @returns true if the value is present in the array, else false.
 *
 * @throws {TypeError} If the first argument is not an array.
 */

export function contains<T>(array: T[], value: unknown): boolean {
  // Fast path: reference / primitive equality via Array.includes — avoids
  // deep-equal traversal for the common case of searching for a scalar.
  if (value === null || value === undefined || typeof value !== 'object') {
    return array.includes(value as T);
  }

  return array.some((val) => isEqual(val, value));
}
