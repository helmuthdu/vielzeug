/**
 * Check if the first argument is less than or equal to the second argument.
 *
 * @example
 * ```ts
 * le(3, 5); // true
 * le(5, 3); // false
 * le(5, 5); // true
 * ```
 *
 * @param a - The first argument to compare.
 * @param b - The second argument to compare.
 *
 * @returns `true` if `a` is less than or equal to `b`, otherwise `false`.
 */
export function le(a: unknown, b: unknown): boolean {
  return typeof a === 'number' && typeof b === 'number' && a <= b;
}
