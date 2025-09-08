import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Boils down an array to a single value by applying a callback function to each pair of elements.
 *
 * @example
 * ```ts
 * boil([1, 2, 3]) // 3
 * boil([1, 2, 3], (a, b) => a > b ? a : b) // 3
 * boil([1, 2, 3], (a, b) => a + b) // 6
 * boil([{ a: 1 }, { a: 2 }, { a: 3 }], (a, b) => ({ a: a.a + b.a })) // { a: 6 }
 * boil([], (a, b) => a + b) // undefined
 * boil([1], (a, b) => a + b) // 1
 * ```
 *
 * @param array - The array to be boiled down.
 * @param callback - The function to invoke for each pair of elements in the array.
 *
 * @return The boiled down value, or `undefined` if the array is empty.
 */
export function boil<T>(array: readonly T[], callback: (a: T, b: T) => T): T | undefined {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, {
    args: { array, callback },
    type: TypeError,
  });

  const fn = callback;

  let result = array[0];
  for (let i = 1; i < array.length; i++) {
    result = fn(result, array[i]);
  }
  return result;
}
