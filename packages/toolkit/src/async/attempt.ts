import { retry } from './retry';

type AttemptOptions = {
  delay?: number | ((attempt: number) => number);
  onError?: (err: unknown) => void;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  signal?: AbortSignal;
  timeout?: number;
  times?: number;
};

export type AttemptResult<R> = { ok: true; value: R } | { error: unknown; ok: false };

/**
 * Executes an async function with a timeout and optional abort signal.
 * @internal
 */
function executeWithTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal | undefined,
  timeout: number,
): Promise<T> {
  const abortSignal = signal
    ? AbortSignal.any([AbortSignal.timeout(timeout), signal])
    : AbortSignal.timeout(timeout);

  if (abortSignal.aborted) {
    return Promise.reject(abortSignal.reason);
  }

  return Promise.race([
    fn(abortSignal),
    new Promise<never>((_, reject) => {
      abortSignal.addEventListener('abort', () => reject(abortSignal.reason), { once: true });
    }),
  ]);
}

/**
 * Attempts to execute a function with retry logic and an optional timeout.
 * Returns a discriminated union so callers can handle success and failure
 * explicitly without relying on `undefined`.
 *
 * @example
 * ```ts
 * const result = await attempt(
 *   async (signal) => {
 *     const response = await fetch('/api/user', { signal });
 *     return response.json();
 *   },
 *   { times: 3, timeout: 5000 },
 * );
 *
 * if (result.ok) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 *
 * @param fn - The function to be executed (receives an AbortSignal).
 * @param [options] - Configuration options.
 * @param [options.times=3] - Total number of attempts (including the first).
 * @param [options.delay=250] - Retry delay in milliseconds or delay resolver.
 * @param [options.shouldRetry] - Predicate for whether a specific error should be retried.
 * @param [options.signal] - AbortSignal to cancel retries.
 * @param [options.onError] - Called with the error when all attempts fail.
 * @param [options.timeout=7000] - Per-attempt timeout in milliseconds.
 *
 * @returns `{ ok: true, value }` on success or `{ ok: false, error }` on failure.
 */
export async function attempt<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  { delay, onError, shouldRetry, signal, timeout = 7000, times = 3 }: AttemptOptions = {},
): Promise<AttemptResult<T>> {
  try {
    const value = await retry(() => executeWithTimeout(fn, signal, timeout), {
      delay,
      shouldRetry,
      signal,
      times,
    });

    return { ok: true, value };
  } catch (err) {
    onError?.(err);

    return { error: err, ok: false };
  }
}
