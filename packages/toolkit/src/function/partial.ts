import type { Fn } from '../types';

type RemoveFirstParameter<T extends Fn> = T extends (first: unknown, ...rest: infer Rest) => unknown ? Rest : never;
type FirstParameter<T extends Fn> = T extends (first: infer First, ...rest: unknown[]) => unknown ? First : never;

/**
 * Partially applies every argument except the first and returns a unary function.
 */
export const partial = <F extends Fn>(
  callback: F,
  ...args: RemoveFirstParameter<F>
): ((value: FirstParameter<F>) => ReturnType<F>) => {
  return (value: FirstParameter<F>) => callback(value, ...args);
};
