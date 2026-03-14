import type { Fn } from '../types';

type RemoveFirstParameter<T extends Fn> = T extends (first: any, ...rest: infer R) => any ? R : never;
type FirstParameter<T extends Fn> = T extends (first: infer A, ...rest: any[]) => any ? A : never;

/**
 * Partially applies a multi-arg function by pre-filling every argument
 * except the first — returning a unary function useful for pipeline composition.
 *
 * @example
 * ```ts
 * const double = (num: number) => num * 2;
 * const doubleAll = partial(select, double);
 * doubleAll([1, 2, 3]); // [2, 4, 6]
 *
 * // In a pipe
 * pipe(partial(select, (x: number) => x > 1 ? x * 2 : null))([1, 2, 3]); // [4, 6]
 * ```
 *
 * @param callback - Any function whose first argument is the collection.
 * @param args - The remaining arguments to pre-apply.
 * @returns A unary function `(collection) => ReturnType<F>`.
 */
export const partial = <F extends Fn>(callback: F, ...args: RemoveFirstParameter<F>) => {
  return (collection: FirstParameter<F>) => callback(collection, ...args);
};
