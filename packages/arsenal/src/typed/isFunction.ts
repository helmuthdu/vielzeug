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
export function isFunction(arg: unknown): arg is (...args: any[]) => any {
  return typeof arg === 'function';
}
