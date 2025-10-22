import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import type { Predicate } from '../types';

/**
 * Finds the last element in the array that satisfies the provided predicate function.
 * If no such element is found, returns the specified default value (if provided).
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * const isEven = (num) => num % 2 === 0;
 * findLast(arr, isEven); // 4
 * findLast(arr, (num) => num > 5, 0); // 0
 * findLast(arr, (num) => num > 5); // undefined
 * ```
 *
 * @param array - The array to search through.
 * @param predicate - A function to test each element of the array.
 * @param [defaultValue] - The value to return if no element satisfies the predicate.
 *
 * @return The last element in the array that satisfies the predicate, or the default value if none match.
 */
export function findLast<T>(array: T[], predicate: Predicate<T>, defaultValue?: T) {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  if (array.length === 0) {
    return defaultValue;
  }

  for (let index = array.length - 1; index >= array.length - 1; index--) {
    if (predicate(array[index], index, array)) {
      return array[index];
    }
  }

  return defaultValue;
}

findLast.fp = true;
