/** biome-ignore-all lint/suspicious/noExplicitAny: - */

import { isPromise } from '../typed/isPromise';
import type { FnDynamic } from '../types';
import { assert } from './assert';

type LastParameters<T> = T extends [...any, infer Last extends FnDynamic] ? Parameters<Last> : never;
type FirstReturnType<F> = F extends [infer First extends FnDynamic, ...any] ? ReturnType<First> : never;
type ComposeReturn<T extends FnDynamic[]> = (
  ...args: LastParameters<T>
) => FirstReturnType<T> extends Promise<any> ? Promise<Awaited<FirstReturnType<T>>> : FirstReturnType<T>;
/**
 * Composes multiple functions into a single function. It starts from the rightmost function and proceeds to the left.
 *
 * @example
 * ```ts
 * const add = (x) => x + 2;
 * const multiply = (x) => x * 3;
 * const subtract = (x) => x - 4;
 * const composedFn = compose(subtract, multiply, add);
 * composedFn(5); // ((5 + 2) * 3) - 4 = 17
 * ```
 *
 * @example
 * ```ts
 * const square = async (x) => x * x;
 * const add = async (x) => x + 2;
 * const composedFn = compose(square, add);
 * await composedFn(4); // (4 * 4) + 2 = 18
 * ```
 *
 * @param fns - List of the functions to be composed.
 *
 * @returns A new function that is the composition of the input functions.
 */
export function compose<T extends FnDynamic[]>(...fns: T): ComposeReturn<T> {
  assert(fns.length > 0, 'compose requires at least one function', { args: { fns } });

  const lastFn = fns.pop()!;
  return ((...args: LastParameters<T>) =>
    fns.reduceRight((prev, fn) => (isPromise(prev) ? prev.then(fn) : fn(prev)), lastFn(...args))) as ComposeReturn<T>;
}
