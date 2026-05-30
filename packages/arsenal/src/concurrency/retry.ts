import { abortError } from '../async/abortError';
import { anySignal } from '../async/anySignal';
import { sleep } from '../async/sleep';

export type AttemptResult<T> = { ok: true; value: T } | { error: unknown; ok: false };

type RetryOptions = {
  delay?: number | ((attempt: number) => number);
  onError?: (error: unknown) => void;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  signal?: AbortSignal;
  timeout?: number;
  times?: number;
};

function buildSignal(timeout: number | undefined, signal: AbortSignal | undefined): AbortSignal | undefined {
  return anySignal(timeout !== undefined ? AbortSignal.timeout(timeout) : undefined, signal);
}

/**
 * Retries an async function with optional per-attempt timeout, delay strategy, and abort support.
 * The function receives a merged AbortSignal from the per-attempt timeout and any external signal.
 * On total failure, throws the last error (use a try/catch to get an `AttemptResult`-style value).
 *
 * @example
 * ```ts
 * // Basic retry
 * const data = await retry(() => fetch('/api').then(r => r.json()), { times: 3 });
 *
 * // With per-attempt timeout and cancellation
 * const data = await retry(
 *   async (signal) => fetch('/api', { signal }).then(r => r.json()),
 *   { times: 3, timeout: 5000 },
 * );
 *
 * // As AttemptResult (never throws)
 * try {
 *   const value = await retry(fn, { times: 3, timeout: 5000 });
 *   return { ok: true, value };
 * } catch (error) {
 *   return { ok: false, error };
 * }
 * ```
 *
 * @param fn - Async function to retry. Receives a merged AbortSignal when timeout or signal is set.
 * @param options - Retry configuration.
 * @param [options.times=3] - Total attempts including the first.
 * @param [options.delay=250] - Delay between retries in ms, or a function of (attemptIndex).
 * @param [options.timeout] - Per-attempt timeout in milliseconds.
 * @param [options.signal] - External AbortSignal to cancel all retries.
 * @param [options.shouldRetry] - Return false to stop retrying for a specific error.
 * @param [options.onError] - Called with the final error before rethrowing.
 * @returns The resolved value.
 * @throws The last error if all attempts fail.
 */
export async function retry<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  { delay = 250, onError, shouldRetry, signal, timeout, times = 3 }: RetryOptions = {},
): Promise<T> {
  for (let attempt = 1; attempt <= times; attempt++) {
    if (signal?.aborted) throw abortError(signal);

    const callSignal = buildSignal(timeout, signal);

    try {
      return await fn(callSignal);
    } catch (err) {
      if (attempt === times) {
        onError?.(err);
        throw err;
      }

      if (shouldRetry && !shouldRetry(err, attempt - 1)) {
        onError?.(err);
        throw err;
      }

      const ms = typeof delay === 'function' ? delay(attempt - 1) : delay;

      if (ms > 0) await sleep(ms, signal);
    }
  }

  throw new Error('Retry failed unexpectedly');
}
