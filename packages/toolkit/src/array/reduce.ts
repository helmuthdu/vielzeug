import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import { isPromise } from '../typed/isPromise';

type SyncCallback<R, T> = (prev: R, curr: T, index: number, array: T[]) => R;
type AsyncCallback<R, T> = (prev: R, curr: T, index: number, array: T[]) => Promise<R>;

/**
 * Reduces an array to a single value. Supports both synchronous and
 * asynchronous callbacks — if the callback returns a Promise on the first
 * call, all later calls are chained via `.then()`.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3];
 * reduce(arr, (acc, curr) => acc + curr, 0); // 6
 * await reduce(arr, async (acc, curr) => acc + curr, 0); // 6
 * ```
 */
export function reduce<T, R>(array: T[], callback: SyncCallback<R, T>, initialValue: R): R;
export function reduce<T, R>(array: T[], callback: AsyncCallback<R, T>, initialValue: R): Promise<R>;
export function reduce<T, R>(
  array: T[],
  callback: SyncCallback<R, T> | AsyncCallback<R, T>,
  initialValue: R,
): R | Promise<R> {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  let acc: R | Promise<R> = initialValue;

  for (let i = 0; i < array.length; i++) {
    const idx = i;
    acc = isPromise(acc)
      ? acc.then((v) => callback(v as any, array[idx], idx, array))
      : callback(acc as R, array[idx], idx, array);
  }

  return acc;
}

reduce.fp = true;
