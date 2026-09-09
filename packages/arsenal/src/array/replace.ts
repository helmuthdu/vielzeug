import type { Predicate } from '../types';

/** Replaces the first matching item without mutating the input. */
export function replace<T>(array: T[], predicate: Predicate<T>, value: T): T[];
export function replace<T>(array: readonly T[], predicate: Predicate<T>, value: T): readonly T[];
export function replace<T>(array: readonly T[], predicate: Predicate<T>, value: T): readonly T[] {
  const index = array.findIndex(predicate);

  if (index === -1) return array;

  return [...array.slice(0, index), value, ...array.slice(index + 1)];
}
