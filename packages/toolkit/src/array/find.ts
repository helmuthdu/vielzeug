import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import type { Predicate } from '../types';

/**
 * Finds the first element in an array that satisfies a predicate function.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * const isEven = (num) => num % 2 === 0;
 * find(arr, isEven); // 2
 * find(arr, (num) => num > 5, 0); // 0
 * find(arr, (num) => num > 5); // undefined
 * ```
 *
 * @param array - The array to search through.
 * @param predicate - A function that is called for each element in the array.
 * @param [defaultValue] - (optional) value to return if no element satisfies the predicate.
 *
 * @return The first element in the array that satisfies the predicate, or the default value if none match.
 */
export function find<T>(array: T[], predicate: Predicate<T>, defaultValue?: T) {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  for (let index = 0; index < array.length; index++) {
    if (predicate(array[index], index, array)) {
      return array[index];
    }
  }

  return defaultValue;
}

find.fp = true;
