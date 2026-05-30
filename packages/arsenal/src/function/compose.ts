import type { Fn } from '../types';

import { assert } from './assert';

type LastParameters<T extends readonly Fn[]> = T extends [...unknown[], infer Last extends Fn]
  ? Parameters<Last>
  : never;
type FirstReturnType<T extends readonly Fn[]> = T extends [infer First extends Fn, ...unknown[]]
  ? ReturnType<First>
  : never;

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
 * @param fns - List of the functions to be composed.
 *
 * @returns A new function that is the composition of the input functions.
 */
export function compose<T extends readonly [Fn, ...Fn[]]>(
  ...fns: T
): (...args: LastParameters<T>) => FirstReturnType<T> {
  assert(fns.length > 0, 'compose requires at least one function', { args: { fns } });

  const lastFn = fns[fns.length - 1];
  const restFns = fns.slice(0, -1);

  return ((...args: LastParameters<T>) => restFns.reduceRight((prev, fn) => fn(prev), lastFn(...args))) as (
    ...args: LastParameters<T>
  ) => FirstReturnType<T>;
}
