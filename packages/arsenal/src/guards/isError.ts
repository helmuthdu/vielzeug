/**
 * Determines if the passed value is an `Error` instance.
 *
 * @example
 * ```ts
 * isError(new Error('oops')); // true
 * isError('oops');            // false
 * isError(null);              // false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` if the value is an `Error` instance.
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}
