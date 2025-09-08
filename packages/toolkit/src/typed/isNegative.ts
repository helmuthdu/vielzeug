/**
 * @description
 * Checks if the value is a negative number.
 *
 * @example
 * ```ts
 * isNegative(-123); // true
 * isNegative(123); // false
 * isNegative(0); // false
 * isNegative(0.1); // false
 * isNegative(-0.1); // true
 * isNegative('hello world'); // false
 * isNegative({}); // false
 * isNegative([]); // false
 * isNegative(new Date()); // false
 * isNegative(null); // false
 * isNegative(undefined); // false
 * isNegative(NaN); // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if the value is a negative number, else `false`.
 */
export function isNegative(arg: unknown): arg is number {
  return typeof arg === 'number' && arg < 0;
}
