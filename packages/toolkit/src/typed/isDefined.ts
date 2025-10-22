/**
 * Checks if a value is defined (not `undefined`).
 *
 * @example
 * ```ts
 * isDefined(123); // true
 * isDefined(undefined); // false
 * isDefined('hello world'); // true
 * isDefined({}); // true
 * isDefined([]); // true
 * isDefined(null); // true
 * ```
 *
 * @param arg - The value to check.
 *
 * @returns `true` if the value is defined, else `false`.
 */
export function isDefined<T>(arg: T | undefined): arg is T {
  return arg !== undefined;
}
