import type { Predicate } from './types';

/**
 * Returns a predicate that negates the given predicate.
 */
export function not<T>(predicate: Predicate<T>): Predicate<T> {
  return (item, index, array) => !predicate(item, index, array);
}

/**
 * Returns a predicate that succeeds when all predicates succeed.
 */
export function and<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (item, index, array) => predicates.every((p) => p(item, index, array));
}

/**
 * Returns a predicate that succeeds when any predicate succeeds.
 */
export function or<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (item, index, array) => predicates.some((p) => p(item, index, array));
}
