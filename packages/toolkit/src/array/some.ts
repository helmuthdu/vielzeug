import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import type { Predicate } from '../types';

/**
 * Checks if at least one element in the array satisfies the provided predicate function.
 *
 * @example
 * ```ts
 * some([1, 2, 3], (n) => n === 2) // true
 * some([1, 2, 3], (n) => n === 4) // false
 * ```
 *
 * @param array - The array to be checked.
 * @param predicate - The function to test each element of the array.
 *
 * @returns `true` if at least one element satisfies the predicate, otherwise `false`.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
export function some<T>(array: T[], predicate: Predicate<T>) {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  for (let index = 0; index < array.length; index++) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }

  return false;
}

some.fp = true;
