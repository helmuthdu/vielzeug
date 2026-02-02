/**
 * Checks if the value is a boolean.
 *
 * @example
 * ```ts
 * isBoolean(true); // true
 * isBoolean(false); // true
 * isBoolean(123); // false
 * isBoolean('hello world'); // false
 * isBoolean({}); // false
 * isBoolean([]); // false
 * isBoolean(new Date()); // false
 * isBoolean(null); // false
 * isBoolean(undefined); // false
 * isBoolean(NaN); // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if the value is a boolean, else `false`.
 */
export function isBoolean(arg: unknown): arg is boolean {
  return typeof arg === 'boolean';
}
