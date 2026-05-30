/**
 * Determines if the passed value is a valid Date Object.
 *
 * @example
 * ```ts
 * isDate(new Date()); // true
 * isDate(123); // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if the value is a valid Date object, else `false`.
 */
export function isDate(arg: unknown): arg is Date {
  return arg instanceof Date && !Number.isNaN(arg.getTime());
}

export const IS_DATE_ERROR_MSG = 'Expected a Date object';
