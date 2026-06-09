import { abortError } from './abortError';
import { sleep } from './sleep';

export type AttemptResult<T> = { ok: true; value: T } | { error: unknown; ok: false };

export type RetryOptions = {
  delay?: number | ((attempt: number) => number);
  onError?: (error: unknown) => void;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  signal?: AbortSignal;
  timeout?: number;
  times?: number;
};

function buildSignal(timeout: number | undefined, signal: AbortSignal | undefined): AbortSignal | undefined {
  const parts = [timeout !== undefined ? AbortSignal.timeout(timeout) : undefined, signal].filter(
    (s): s is AbortSignal => s != null,
  );

  if (parts.length === 0) return undefined;

  if (parts.length === 1) return parts[0];

  return AbortSignal.any(parts);
}

/**
 * Executes an async function and returns an `AttemptResult` — never throws.
 * On success, returns `{ ok: true, value }`. On failure, returns `{ ok: false, error }`.
 *
 * @example
 * ```ts
 * const result = await attempt(() => fetch('/api').then(r => r.json()));
 * if (result.ok) console.log(result.value);
 * else console.error(result.error);
 * ```
 *
 * @param fn - Async function to execute.
 * @returns An `AttemptResult` that is either `{ ok: true, value }` or `{ ok: false, error }`.
 */
export async function attempt<T>(fn: () => Promise<T>): Promise<AttemptResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { error, ok: false };
  }
}

/**
 * Retries an async function with optional per-attempt timeout, delay strategy, and abort support.
 * The function receives a merged AbortSignal from the per-attempt timeout and any external signal.
 * On total failure, throws the last error (use `attempt()` to get an `AttemptResult` without throwing).
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
 * // As AttemptResult (never throws) — use attempt() + retry() together
 * const result = await attempt(() => retry(fn, { times: 3 }));
 * ```
 *
 * @param fn - Async function to retry. Receives a merged AbortSignal when timeout or signal is set.
 * @param options - Retry configuration.
 * @param [options.times=3] - Total attempts including the first.
 * @param [options.delay=250] - Delay between retries in ms, or a function of (attemptIndex).
 * @param [options.timeout] - Per-attempt timeout in milliseconds.
 * @param [options.signal] - External AbortSignal to cancel all retries.
 * @param [options.shouldRetry] - Predicate called after each non-final failure.
 *   Receives the error and the number of failures so far (0-indexed: `0` on the first failure,
 *   `1` on the second, etc.). Return `false` to abort immediately. **Not called on the final attempt**
 *   (use `onError` to observe the final error unconditionally).
 * @param [options.onError] - Called with the final error before rethrowing.
 * @returns The resolved value.
 * @throws The last error if all attempts fail.
 */
export async function retry<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  { delay = 250, onError, shouldRetry, signal, timeout, times = 3 }: RetryOptions = {},
): Promise<T> {
  for (let tryCount = 1; tryCount <= times; tryCount++) {
    if (signal?.aborted) throw abortError(signal);

    const callSignal = buildSignal(timeout, signal);

    try {
      return await fn(callSignal);
    } catch (err) {
      if (tryCount === times) {
        onError?.(err);
        throw err;
      }

      if (shouldRetry && !shouldRetry(err, tryCount - 1)) {
        onError?.(err);
        throw err;
      }

      const ms = typeof delay === 'function' ? delay(tryCount - 1) : delay;

      if (ms > 0) await sleep(ms, signal);
    }
  }

  /* unreachable — the loop always returns or throws before exhausting all attempts */
  return undefined as never;
}
