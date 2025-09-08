/**
 * Determines if the passed value is a number.
 *
 * @example
 * ```ts
 * isNumber(123); // true
 * isNumber('hello world'); // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if the value is a number, else `false`.
 */
export function isNumber(arg: unknown): arg is number {
  return typeof arg === 'number' && !Number.isNaN(arg);
}

export const IS_NUMBER_ERROR_MSG = 'Expected a number';
