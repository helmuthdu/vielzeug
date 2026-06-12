/**
 * Checks if the provided argument is a regular expression.
 *
 * @example
 * ```ts
 * isRegex(/abc/); // true
 * isRegex(new RegExp('abc')); // true
 * isRegex('abc'); // false
 * isRegex(123); // false
 * isRegex({}); // false
 * isRegex([]); // false
 * isRegex(null); // false
 * isRegex(undefined); // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @return `true` if the argument is a regular expression, otherwise `false`.
 */
export function isRegex(arg: unknown): arg is RegExp {
  return arg instanceof RegExp;
}
