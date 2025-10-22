import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import { isPromise } from '../typed/isPromise';
import type { CallbackDynamic, ResultArray } from '../types';

/**
 * Transforms an array by applying a callback function to each of its elements.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3];
 * map(arr, x => x * 2); // [2, 4, 6]
 * map(arr, async x => x * 2); // Promise<[2, 4, 6]>
 * ```
 *
 * @param array - The array to be transformed.
 * @param callback - The function to invoke for each element in the array.
 *
 * @return The transformed array, either as a synchronous result or a Promise if lazy is set.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
export function map<T, R, C extends CallbackDynamic<T, R>>(array: T[], callback: C): ResultArray<C> {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, {
    args: { array },
    type: TypeError,
  });

  const result = Array(array.length);

  for (let index = 0; index < array.length; index++) {
    result[index] = callback(array[index], index, array);
  }

  return (isPromise(callback) ? Promise.all(result) : result) as ResultArray<C>;
}

map.fp = true;
