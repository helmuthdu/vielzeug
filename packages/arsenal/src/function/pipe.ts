import type { Fn } from '../types';

import { assert } from './assert';

type FirstParameters<T extends readonly Fn[]> = T extends [infer First extends Fn, ...unknown[]]
  ? Parameters<First>
  : never;
type LastReturnType<T extends readonly Fn[]> = T extends [...unknown[], infer Last extends Fn]
  ? ReturnType<Last>
  : never;

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
 * @param fns - List of functions to be piped.
 *
 * @returns A new function that is the pipe of the input functions.
 */
export function pipe(): never;
export function pipe<T extends readonly [Fn, ...Fn[]]>(...fns: T): (...args: FirstParameters<T>) => LastReturnType<T>;
export function pipe(...fns: Fn[]): Fn {
  assert(fns.length > 0, 'pipe requires at least one function');

  const [firstFn, ...restFns] = fns;

  return (...args: unknown[]) => restFns.reduce((prev: unknown, fn) => fn(prev), firstFn!(...args));
}
