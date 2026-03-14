import type { Fn } from '../types';
import { predict } from './predict';
import { retry } from './retry';

type AttemptOptions = {
  times?: number;
  onError?: (err: unknown) => void;
  timeout?: number;
};

export type AttemptResult<R> = { ok: true; value: R } | { ok: false; error: unknown };

/**
 * Attempts to execute a function with retry logic and an optional timeout.
 * Returns a discriminated union so callers can handle success and failure
 * explicitly without relying on `undefined`.
 *
 * @example
 * ```ts
 * const result = await attempt(fetchUser, { times: 3, timeout: 5000 });
 *
 * if (result.ok) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 *
 * @param fn - The function to be executed.
 * @param [options] - Configuration options.
 * @param [options.times=3] - Total number of attempts (including the first).
 * @param [options.onError] - Called with the error when all attempts fail.
 * @param [options.timeout=7000] - Per-attempt timeout in milliseconds.
 *
 * @returns `{ ok: true, value }` on success or `{ ok: false, error }` on failure.
 */
export async function attempt<T extends Fn, R = Awaited<ReturnType<T>>>(
  fn: T,
  { onError, times = 3, timeout = 7000 }: AttemptOptions = {},
): Promise<AttemptResult<R>> {
  try {
    const value = await retry(() => predict<R>(() => fn(), { timeout }), { times });
    return { ok: true, value };
  } catch (err) {
    onError?.(err);
    return { ok: false, error: err };
  }
}
