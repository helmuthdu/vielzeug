/**
 * Checks if the first argument is less than the second argument.
 *
 * @example
 * ```ts
 * lt(3, 5); // true
 * lt(5, 3); // false
 * lt(5, 5); // false
 * ```
 *
 * @param a - The first argument to compare.
 * @param b - The second argument to compare.
 *
 * @returns `true` if `a` is less than `b`, otherwise `false`.
 */
export function lt(a: unknown, b: unknown): boolean {
  return typeof a === 'number' && typeof b === 'number' && a < b;
}
