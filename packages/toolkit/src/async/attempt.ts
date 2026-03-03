import type { Fn } from '../types';
import { predict } from './predict';
import { retry } from './retry';

type AttemptOptions = {
  identifier?: string;
  retries?: number;
  onError?: (err: unknown) => void;
  timeout?: number;
};

/**
 * Attempts to execute a function with advanced error handling and retry logic.
 *
 * @example
 * ```ts
 * const unreliableFunction = async () => {
 *   if (Math.random() < 0.7) throw new Error ('Random failure');
 *   return 'Success!';
 * };
 *
 * await attempt(
 *   unreliableFunction,
 *   { retries: 3, timeout: 5000 }); // Success! (or undefined if all attempts failed)
 * ```
 *
 * @param fn - The function to be executed.
 * @param [options] - Configuration options for the attempt.
 * @param [options.identifier] - Custom identifier shown in the default error log.
 * @param [options.retries=0] - Number of retry attempts if the function fails.
 * @param [options.onError] - Called with the error when all attempts fail. Defaults to `console.error`.
 * @param [options.timeout=7000] - Timeout in milliseconds for function execution.
 *
 * @returns The result of the function or undefined if it failed.
 */
export async function attempt<T extends Fn, R = Awaited<ReturnType<T>>>(
  fn: T,
  { onError, retries = 0, timeout = 7000, identifier = fn.name || 'anonymous function' }: AttemptOptions = {},
): Promise<R | undefined> {
  try {
    return await retry(() => predict<R>(() => fn(), { timeout }), { times: retries + 1 });
  } catch (err) {
    (onError ?? ((e) => console.error(`attempt(${identifier}) -> all attempts failed`, { cause: e })))(err);
    return undefined;
  }
}
