import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import type { Predicate } from '../types';

/**
 * Filters an array based on a predicate function.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * const isEven = (num) => num % 2 === 0;
 * filter(arr, isEven); // [2, 4]
 * ```
 *
 * @param array - The array to filter.
 * @param predicate - The predicate function to test each element.
 *
 * @returns A new array with elements that pass the predicate test.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
export function filter<T>(array: T[], predicate: Predicate<T>) {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const result: T[] = [];

  for (let index = 0; index < array.length; index++) {
    if (predicate(array[index], index, array)) {
      result.push(array[index]);
    }
  }

  return result;
}

filter.fp = true;
