import type { Fn } from '../types';
import { assert } from './assert';

// biome-ignore lint/suspicious/noExplicitAny: -
type RemoveFirstParameter<T extends Fn> = T extends (first: any, ...rest: infer R) => any ? R : never;

/**
 * Creates a function that can be used in functional programming mode.
 * This function is a wrapper around the original function, allowing you to pass the first argument as an array.
 *
 * @example
 * ```ts
 * import { fp } from './fp';
 * import { map } from './map';
 *
 * const double = (num: number) => num * 2;
 * const doubleArray = fp(map, double);
 *
 * doubleArray([1, 2, 3]) // [2, 4, 6]
 * ```
 *
 * @param callback - The function to be wrapped.
 * @param args - The arguments to be passed to the function.
 *
 * @returns A function that takes an array and applies the original function to it.
 *
 * @throws {TypeError} If the function cannot be used in functional programming mode.
 */
export const fp = <T, F extends Fn = Fn>(callback: F, ...args: RemoveFirstParameter<F>) => {
  assert(
    // biome-ignore lint/suspicious/noExplicitAny: -
    (callback as any).fp,
    `"${callback.name}" cannot be used in functional programming mode. Please use the original function.`,
  );
  return (array: T[]) => callback(array, ...args);
};
