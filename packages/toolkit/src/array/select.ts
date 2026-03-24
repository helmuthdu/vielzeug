import type { Predicate } from '../types';

import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import { isNil } from '../typed/isNil';

/**
 * Selects elements from an array based on a callback function and an optional predicate function.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4];
 * select(arr, x => x * x, x => x > 2) // [9, 16]
 * select(arr, x => x * x) // [1, 4, 9, 16]
 * ```
 *
 * @param array - The array to select from.
 * @param callback - The function to map the values.
 * @param [predicate] - (optional) The function to filter the values.
 *
 * @returns A new array with the selected values.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
export function select<T, R>(
  array: T[],
  callback: (item: T, index: number, array: T[]) => R,
  predicate?: Predicate<T>,
): R[] {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const isValid = predicate ?? ((value: T) => !isNil(value));
  const result: R[] = [];

  for (let index = 0; index < array.length; index++) {
    if (isValid(array[index], index, array)) {
      result.push(callback(array[index], index, array));
    }
  }

  return result;
}
