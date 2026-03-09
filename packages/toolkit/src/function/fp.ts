import type { Fn } from '../types';

// biome-ignore lint/suspicious/noExplicitAny: -
type RemoveFirstParameter<T extends Fn> = T extends (first: any, ...rest: infer R) => any ? R : never;

/**
 * Converts an array-first, multi-arg function into a unary function that takes
 * only the array — useful for pipeline composition.
 *
 * @example
 * ```ts
 * const double = (num: number) => num * 2;
 * const doubleAll = fp(select, double);
 * doubleAll([1, 2, 3]); // [2, 4, 6]
 *
 * // In a pipe
 * pipe(fp(select, (x: number) => x > 1 ? x * 2 : null))([1, 2, 3]); // [4, 6]
 * ```
 *
 * @param callback - Any function whose first argument is the array.
 * @param args - The remaining arguments to pre-apply.
 * @returns A unary function `(array: T[]) => ReturnType<F>`.
 */
export const fp = <T, F extends Fn = Fn>(callback: F, ...args: RemoveFirstParameter<F>) => {
  return (array: T[]) => callback(array, ...args);
};
