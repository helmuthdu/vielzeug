/**
 * Determines if the passed value is null or undefined.
 *
 * @example
 * ```ts
 * isNil(null); // true
 * isNil(undefined); // true
 * isNil(''); // false
 * isNil(0); // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if the value is null or undefined, else `false`.
 */
export function isNil(arg: unknown): arg is null | undefined {
  return arg === undefined || arg === null;
}

export const IS_NIL_ERROR_MSG = 'Expected a null or undefined value';
