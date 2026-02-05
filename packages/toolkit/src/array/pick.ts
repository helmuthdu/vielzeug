import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import { isNil } from '../typed/isNil';

/**
 * Picks the first element from an array that satisfies a predicate function
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4];
 * pick(arr, x => x * x, x => x > 2) // 9
 * await pick(arr, async x => x * x, x => x > 2) // 9
 * ```
 *
 * @param array - The array to search.
 * @param callback - A function that is called for each element in the array.
 * @param predicate - A function that is called to validate each element in the array.
 *
 * @return The first element that satisfies the predicate, or undefined if no such element is found.
 *
 * @throws {TypeError} If the first argument is not an array.
 */
export function pick<T, R = T>(
  array: T[],
  callback: (item: T, index: number, array: T[]) => R,
  predicate?: (item: T, index: number, array: T[]) => boolean,
): R | undefined {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const isValid = predicate ?? ((value: T) => !isNil(value));

  for (let index = 0; index < array.length; index++) {
    if (isValid(array[index], index, array)) {
      return callback(array[index], index, array);
    }
  }

  return undefined;
}

pick.fp = true;
