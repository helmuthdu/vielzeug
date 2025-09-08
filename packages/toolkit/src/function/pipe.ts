/** biome-ignore-all lint/suspicious/noExplicitAny: - */

import { isPromise } from '../typed/isPromise';
import type { FnDynamic } from '../types';
import { assert } from './assert';

type FirstParameters<T> = T extends [infer First extends FnDynamic, ...any] ? Parameters<First> : never;
type LastReturnType<T> = T extends [...any, infer Last extends FnDynamic] ? ReturnType<Last> : never;
type PipeReturn<T extends FnDynamic[]> = (
  ...args: FirstParameters<T>
) => LastReturnType<T> extends Promise<any> ? Promise<Awaited<LastReturnType<T>>> : LastReturnType<T>;

/**
 * Pipes multiple functions into a single function. It starts from the leftmost function and proceeds to the right.
 *
 * @example
 * ```ts
 * const add = (x) => x + 2;
 * const multiply = (x) => x * 3;
 * const subtract = (x) => x - 4;
 * const pipedFn = pipe(subtract, multiply, add);
 *
 * pipedFn(5); // ((5-4) * 3) + 2 = 5
 * ```
 *
 * @example
 * ```ts
 * const square = async (x) => x * x;
 * const add = async (x) => x + 2;
 * const pipedFn = pipe(square, add);
 *
 * await pipedFn(4); // (4 * 4) + 2 = 18
 * ```
 *
 * @param fns - List of functions to be piped.
 *
 * @returns A new function that is the pipe of the input functions.
 */
export function pipe<T extends FnDynamic[]>(...fns: T) {
  assert(fns.length > 0, 'pipe requires at least one function', { args: { fns } });

  const firstFn = fns.shift()!;
  return ((...args: FirstParameters<T>) =>
    fns.reduce((prev, fn) => (isPromise(prev) ? prev.then(fn) : fn(prev)), firstFn(...args))) as PipeReturn<T>;
}
