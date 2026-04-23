import type { Fn } from '../types';

import { retry } from './retry';

type AttemptOptions = {
  onError?: (err: unknown) => void;
  timeout?: number;
  times?: number;
};

export type AttemptResult<R> = { ok: true; value: R } | { error: unknown; ok: false };

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
  { onError, timeout = 7000, times = 3 }: AttemptOptions = {},
): Promise<AttemptResult<R>> {
  try {
    const value = await retry(() => executeWithTimeout<R>(() => fn(), { timeout }), { times });

    return { ok: true, value };
  } catch (err) {
    onError?.(err);

    return { error: err, ok: false };
  }
}

/**
 * Executes a function with a timeout by using AbortSignal.
 * @internal
 */
function executeWithTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: { signal?: AbortSignal; timeout?: number } = {},
): Promise<T> {
  const { signal, timeout = 7000 } = options;
  const abortSignal = signal ? AbortSignal.any([AbortSignal.timeout(timeout), signal]) : AbortSignal.timeout(timeout);

  return Promise.race([
    fn(abortSignal),
    new Promise<never>((_, reject) => {
      abortSignal.addEventListener('abort', () => reject(abortSignal.reason), { once: true });
    }),
  ]);
}
