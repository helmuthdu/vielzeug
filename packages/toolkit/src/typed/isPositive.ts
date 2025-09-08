/**
 * Checks if the value is a positive number.
 *
 * @example
 * ```ts
 * isPositive(123); // true
 * isPositive(-123); // false
 * isPositive(0); // false
 * isPositive(0.1); // true
 * isPositive(-0.1); // false
 * isPositive('hello world'); // false
 * isPositive({}); // false
 * isPositive([]); // false
 * isPositive(new Date()); // false
 * isPositive(null); // false
 * isPositive(undefined); // false
 * isPositive(NaN); // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if the value is a positive number, else `false`.
 *
 */
export function isPositive(arg: unknown): arg is number {
  return typeof arg === 'number' && arg > 0;
}
