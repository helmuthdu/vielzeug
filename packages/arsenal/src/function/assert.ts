import type { Obj } from '../types';

type AssertOptions = { args?: Obj; type?: ErrorConstructor };

/**
 * Asserts that a condition is true.
 *
 * @example
 * ```ts
 * assert(Array.isArray([]));                      // ok
 * assert(x > 0, 'x must be positive');            // throws if false
 * assert(x > 0, 'x must be positive', { args: { x } });
 * assertAll([cond1, cond2], 'One failed');         // throws if any is false
 * ```
 *
 * @param condition - The boolean condition to assert.
 * @param [message] - Error message (default: `'Assertion failed'`).
 * @param [options.type] - Error class to throw (default: `Error`).
 * @param [options.args] - Debugging info appended to the message.
 * @throws {Error} If `condition` is false.
 */
export function assert(
  condition: boolean,
  message = 'Assertion failed',
  { args, type = Error }: AssertOptions = {},
): void {
  if (condition) return;

  let errorDetails = '';

  if (args) {
    try {
      errorDetails = `\nArguments: ${JSON.stringify(args, null, 2)}`;
    } catch {
      const parts = Object.entries(args)
        .map(([k, v]) => {
          try {
            return `${k}: ${JSON.stringify(v)}`;
          } catch {
            return `${k}: [circular]`;
          }
        })
        .join(', ');

      errorDetails = `\nArguments: { ${parts} }`;
    }
  }

  throw new type(`${message}${errorDetails}`);
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
