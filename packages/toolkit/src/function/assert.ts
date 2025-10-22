import { Logit } from '@vielzeug/logit';
import type { Obj } from '../types';

/**
 * Asserts that the condition is true. If the condition is false, it throws an error
 * with the provided message or logs a warning in soft mode.
 *
 * @example
 * ```ts
 * assert(Array.isArray([])); // Does nothing
 * assert(typeof foo === 'string', 'This is an error message'); // Throws an error
 * assert(x > 0, 'x must be positive', { args: { x } }); // Throws with argument details
 * ```
 *
 * @param condition - The condition to assert, or an array of conditions.
 * @param [message] - The error message to throw. Default is 'Assertion failed'.
 * @param options - Assertion options.
 * @param [options.type] - The error class to throw (default: `Error`).
 * @param [options.args] - Additional debugging information (e.g., variable values).
 * @param [options.bypass] - If `true`, logs a warning instead of throwing an error.
 *
 * @throws {Error} If the condition is false and `bypass` is not set to `true`.
 */
export function assert(
  condition: boolean | boolean[],
  message = 'Assertion failed',
  { type = Error, args, bypass = false }: { type?: ErrorConstructor; args?: Obj; bypass?: boolean } = {},
): void {
  const failed = Array.isArray(condition) ? condition.some((cond) => !cond) : !condition;
  if (!failed) return;

  const errorDetails = args ? `\nArguments: ${JSON.stringify(args, null, 2)}` : '';
  const fullMessage = `${message}${errorDetails}`;

  if (bypass) Logit.warn(fullMessage);
  else throw new type(fullMessage);
}
