import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import { filter } from './filter';

/**
 * Removes falsy values from an array.
 *
 * @example
 * ```ts
 * const arr = [0, 1, false, 2, '', 3];
 * compact(arr); // [1, 2, 3]
 * ```
 *
 * @param array - The array to compact.
 *
 * @returns A new array with falsy values removed.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
export function compact<T>(array: T[]) {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  return filter(array, Boolean);
}
