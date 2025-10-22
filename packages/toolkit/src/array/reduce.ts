import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import { isPromise } from '../typed/isPromise';
import type { Result } from '../types';

type SyncCallback<R, T> = (prev: R, curr: T, index: number, array: T[]) => R;
type AsyncCallback<R, T> = (prev: R, curr: T, index: number, array: T[]) => Promise<R>;
type Callback<R, T> = SyncCallback<R, T> | AsyncCallback<R, T>;

/**
 * Reduces an array to a single value by applying a callback function
 * to each element in the array, passing the accumulated result and
 * the current element as arguments. Supports both synchronous and
 * asynchronous callback functions.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3];
 * reduce(arr, (acc, curr) => acc + curr, 0); // 10
 * await reduce(arr, async (acc, curr) => acc + curr, 0); // 10
 * ```
 *
 * @param array - The array to reduce.
 * @param callback - The callback function to apply to each element.
 * @param initialValue - The initial value for the accumulator.
 *
 * @returns The reduced value, or a Promise that resolves to the reduced value if the callback is asynchronous.
 *
 * @throws {TypeError} If the first argument is not an array.
 */
export function reduce<T, R, C extends Callback<R, T>>(array: T[], callback: C, initialValue: R) {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const lazy = isPromise(callback);

  let acc: R | Promise<R> = lazy ? Promise.resolve(initialValue) : initialValue;

  for (let i = 0; i < array.length; i++) {
    if (lazy) {
      acc = (acc as Promise<R>).then((resolvedAcc) => callback(resolvedAcc, array[i], i, array));
    } else {
      acc = callback(acc as R, array[i], i, array);
    }
  }

  return acc as Result<C>;
}

reduce.fn = true;
