import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Folds an array down to a single value by applying a callback to each pair of
 * elements (reduce without an initial value).
 *
 * @example
 * ```ts
 * fold([1, 2, 3], (a, b) => a + b) // 6
 * fold([1, 2, 3], (a, b) => a > b ? a : b) // 3
 * fold([{ a: 1 }, { a: 2 }], (a, b) => ({ a: a.a + b.a })) // { a: 3 }
 * fold([], (a, b) => a + b) // undefined
 * fold([1], (a, b) => a + b) // 1
 * ```
 *
 * @param array - The array to fold.
 * @param callback - The function to invoke for each pair of elements.
 * @returns The folded value, or `undefined` if the array is empty.
 *
 * @throws {TypeError} If the first argument is not an array.
 */
export function fold<T>(array: readonly T[], callback: (a: T, b: T) => T): T | undefined {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, {
    args: { array, callback },
    type: TypeError,
  });

  let result = array[0];

  for (let i = 1; i < array.length; i++) {
    result = callback(result, array[i]);
  }

  return result;
}
