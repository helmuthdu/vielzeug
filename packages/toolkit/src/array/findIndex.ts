import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import type { Predicate } from '../types';

/**
 * Finds the first element in an array that satisfies a predicate function. If no such element is found, returns -1.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * const isEven = (num) => num % 2 === 0;
 * findIndex(arr, isEven); // 1
 * findIndex(arr, (num) => num > 5); // -1
 * ```
 *
 * @param array - The array to search.
 * @param predicate - A function that is called for each element in the array.
 *
 * @return The index of the first element that satisfies the predicate, or -1 if no such element is found.
 */
export function findIndex<T>(array: T[], predicate: Predicate<T>) {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  for (let index = 0; index < array.length; index++) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }

  return -1;
}

findIndex.fp = true;
