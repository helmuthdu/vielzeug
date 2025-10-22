import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import type { Predicate } from '../types';

/**
 * Checks if all elements in an array pass a predicate function.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * const isEven = (num) => num % 2 === 0;
 * every(arr, isEven); // false
 * ```
 *
 * @param array - The array to check.
 * @param predicate - The predicate function to test each element.
 *
 * @returns true if all elements pass the predicate test, else false.
 *
 * @throws {TypeError} If the first argument is not an array.
 */
export function every<T>(array: T[], predicate: Predicate<T>) {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  for (let index = 0; index < array.length; index++) {
    if (!predicate(array[index], index, array)) {
      return false;
    }
  }

  return true;
}

every.fp = true;
