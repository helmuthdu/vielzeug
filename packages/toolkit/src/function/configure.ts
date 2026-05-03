import type { Fn } from '../types';

type RemoveFirstParameter<T extends Fn> = T extends (first: any, ...rest: infer R) => any ? R : never;
type FirstParameter<T extends Fn> = T extends (first: infer A, ...rest: any[]) => any ? A : never;

/**
 * Configures a multi-arg function by pre-filling every argument
 * except the first, returning a unary function useful for composition.
 */
export const configure = <F extends Fn>(callback: F, ...args: RemoveFirstParameter<F>) => {
  return (collection: FirstParameter<F>) => callback(collection, ...args);
};
