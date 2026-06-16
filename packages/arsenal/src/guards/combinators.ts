import type { Predicate } from '../types';

/**
 * Returns a predicate that is `true` only when every provided predicate is `true`.
 *
 * With zero predicates, returns `true` for all values (vacuous truth).
 *
 * @example
 * ```ts
 * const isPositiveEven = allOf(
 *   (n) => n > 0,
 *   (n) => n % 2 === 0,
 * );
 * [1, 2, 3, 4].filter(isPositiveEven); // [2, 4]
 * ```
 */
export function allOf<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (value) => predicates.every((predicate) => predicate(value));
}

/**
 * Returns a predicate that is `true` when at least one provided predicate is `true`.
 *
 * With zero predicates, returns `false` for all values (vacuous falsity).
 *
 * @example
 * ```ts
 * [1, 2, 3, 4].filter(anyOf((n) => n === 1, (n) => n === 3)); // [1, 3]
 * ```
 */
export function anyOf<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (value) => predicates.some((predicate) => predicate(value));
}

/**
 * Returns a predicate that is `true` when none of the provided predicates match.
 * With a single predicate this is equivalent to logical NOT.
 *
 * With zero predicates, returns `true` for all values (nothing fails — vacuous truth).
 *
 * @example
 * ```ts
 * [1, 2, 3, 4].filter(noneOf((n) => n % 2 === 0)); // [1, 3]
 * ```
 */
export function noneOf<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (value) => predicates.every((predicate) => !predicate(value));
}

/**
 * Returns a predicate that negates the given predicate.
 *
 * @example
 * ```ts
 * [1, 2, 3, 4].filter(not((n) => n % 2 === 0)); // [1, 3]
 * ```
 */
export function not<T>(predicate: Predicate<T>): Predicate<T> {
  return (value) => !predicate(value);
}
