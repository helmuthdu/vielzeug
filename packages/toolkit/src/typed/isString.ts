/**
 * Determines if the passed value is a String.
 *
 * @example
 * ```ts
 * isString('Hello World'); // true
 * isString(42); // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if the value is a String, else `false`.
 */
export function isString(arg: unknown): arg is string {
  return typeof arg === 'string';
}

export const IS_STRING_ERROR_MSG = 'Expected a string';
