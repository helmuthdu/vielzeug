/**
 * Checks if the first argument is greater than the second argument.
 *
 * @example
 * ```ts
 * gt(5, 3); // true
 * gt(3, 5); // false
 * gt(5, 5); // false
 * ```
 *
 * @param a - The first argument to compare.
 * @param b - The second argument to compare.
 *
 * @returns `true` if `a` is greater than `b`, otherwise `false`.
 */
export function gt(a: unknown, b: unknown): boolean {
  return typeof a === 'number' && typeof b === 'number' && a > b;
}
