import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import { isEqual } from '../typed/isEqual';

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

// biome-ignore lint/suspicious/noExplicitAny: -
export function contains<T>(array: T[], value: any): boolean {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  return array.some((val) => isEqual(val, value));
}

contains.fp = true;
