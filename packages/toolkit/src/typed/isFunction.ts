/**
 * Determines if the passed value is a function.
 *
 * @example
 * ```ts
 * isFunction(function() {}) // true
 * isFunction(() => {}) // true
 * isFunction('hello world') // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if the value is a function, else `false`.
 */
export function isFunction(arg: unknown): boolean {
  return typeof arg === 'function';
}

export const IS_FUNCTION_ERROR_MSG = 'Expected a function';
