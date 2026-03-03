/**
 * Checks if the first argument is greater than or equal to the second argument.
 *
 * @example
 * ```ts
 * ge(5, 3); // true
 * ge(3, 5); // false
 * ge(5, 5); // true
 * ge(5, '3'); // false
 * ge('5', 3); // false
 * ge('5', '3'); // false
 * ```
 * @param a - The first argument to compare.
 * @param b - The second argument to compare.
 *
 * @returns `true` if `a` is greater than or equal to `b`, otherwise `false`.
 */
export function ge(a: unknown, b: unknown): boolean {
  return typeof a === 'number' && typeof b === 'number' && a >= b;
}
