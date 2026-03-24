import type { Obj } from '../types';

type AssertOptions = { args?: Obj; bypass?: boolean; type?: ErrorConstructor };

/**
 * Asserts that a condition is true. Throws (or warns, with `bypass`) otherwise.
 *
 * @example
 * ```ts
 * assert(Array.isArray([]));                      // ok
 * assert(x > 0, 'x must be positive');            // throws if false
 * assert(x > 0, 'x must be positive', { args: { x } });
 * assert(ok, 'not ok', { bypass: true });         // logs warning instead of throwing
 * assertAll([cond1, cond2], 'One failed');         // throws if any is false
 * ```
 *
 * @param condition - The boolean condition to assert.
 * @param [message] - Error message (default: `'Assertion failed'`).
 * @param [options.type] - Error class to throw (default: `Error`).
 * @param [options.args] - Debugging info appended to the message.
 * @param [options.bypass] - Log a warning instead of throwing.
 *
 * @throws {Error} If `condition` is false and `bypass` is not set.
 */
export function assert(
  condition: boolean,
  message = 'Assertion failed',
  { args, bypass = false, type = Error }: AssertOptions = {},
): void {
  if (condition) return;

  const errorDetails = args ? `\nArguments: ${JSON.stringify(args, null, 2)}` : '';
  const fullMessage = `${message}${errorDetails}`;

  if (bypass) console.warn(fullMessage);
  else throw new type(fullMessage);
}

/**
 * Asserts that every condition in the array is true.
 *
 * @example
 * ```ts
 * assertAll([cond1, cond2, cond3], 'One or more conditions failed');
 * ```
 */
export function assertAll(conditions: boolean[], message = 'Assertion failed', options: AssertOptions = {}): void {
  assert(conditions.every(Boolean), message, options);
}
