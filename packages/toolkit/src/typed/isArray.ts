/**
 * Determines if the passed value is an array.
 *
 * @example
 * ```ts
 * isArray([1, 2, 3]) // true
 * isArray(1, 2, 3) // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if the value is an array, else `false`.
 */
export function isArray(arg: unknown): arg is Array<unknown> {
  return Array.isArray(arg);
}

export const IS_ARRAY_ERROR_MSG = 'Expected an array';
