import type { Predicate } from '../types';

export function and<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (value, index, array) => predicates.every((predicate) => predicate(value, index, array));
}

export function or<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (value, index, array) => predicates.some((predicate) => predicate(value, index, array));
}

export function not<T>(predicate: Predicate<T>): Predicate<T> {
  return (value, index, array) => !predicate(value, index, array);
}
