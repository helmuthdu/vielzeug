/**
 * Checks if the value is zero.
 *
 * @example
 * ```ts
 * isZero(0); // true
 * isZero(123); // false
 * isZero(-123); // false
 * isZero(0.0000001); // false
 * isZero('hello world'); // false
 * isZero({}); // false
 * isZero([]); // false
 * isZero(new Date()); // false
 * isZero(null); // false
 * isZero(undefined); // false
 * isZero(NaN); // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if the value is zero, else `false`.
 *
 */
export function isZero(arg: unknown): arg is number {
  return typeof arg === 'number' && arg === 0;
}
