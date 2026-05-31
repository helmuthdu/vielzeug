/**
 * Asserts that a condition is true. Throws with `message` if false.
 *
 * @example
 * ```ts
 * assert(Array.isArray(x));
 * assert(x > 0, 'x must be positive');
 * assert(n >= 1, 'must be at least 1', { type: RangeError });
 * ```
 *
 * @param condition - The boolean condition to assert.
 * @param [message] - Error message (default: `'Assertion failed'`).
 * @param [options.type] - Error class to throw (default: `Error`).
 * @throws {Error} If `condition` is false.
 */
export function assert(condition: boolean, message = 'Assertion failed', options?: { type?: ErrorConstructor }): void {
  if (!condition) throw new (options?.type ?? Error)(message);
}
