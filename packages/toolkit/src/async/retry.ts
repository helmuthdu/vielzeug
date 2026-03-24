import { sleep } from './sleep';

/**
 * Retries an asynchronous function a specified number of times with delay and optional exponential backoff.
 *
 * @example
 * ```ts
 * retry(() => fetchData(), { times: 3, delay: 1000, backoff: 2, signal: abortSignal })
 *   .then(result => console.log(result))
 *   .catch(error => console.error(error));
 * ```
 *
 * @param fn - The asynchronous function to retry.
 * @param options - (optional) Options for retrying the function.
 * @param [options.times=3] - Total number of attempts (including the first).
 * @param [options.delay=250] - The delay in milliseconds between retries. Ignored when `retryDelay` is provided.
 * @param [options.backoff=1] - Exponential backoff factor (default: 1 → no backoff). Ignored when `retryDelay` is provided.
 * @param [options.retryDelay] - Per-attempt delay function. `attempt` is 0-based (0 = waiting before the 2nd try). Supersedes `delay` and `backoff`.
 * @param [options.signal] - `AbortSignal` to cancel retries; throws the signal's `reason` on abort.
 * @param [options.shouldRetry] - Return `false` to stop retrying immediately for a specific error. `attempt` is 0-based failure count.
 *
 * @returns The result of the asynchronous function.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  {
    backoff = 1,
    delay = 250,
    retryDelay,
    shouldRetry,
    signal,
    times = 3,
  }: {
    backoff?: number | ((attempt: number, currentDelay: number) => number);
    delay?: number;
    /** Per-attempt delay override. `attempt` is 0-based (0 = before the 2nd try). Supersedes `delay` and `backoff`. */
    retryDelay?: (attempt: number) => number;
    /** Return `false` to stop retrying for a specific error. `attempt` is 0-based failure count. */
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    signal?: AbortSignal;
    times?: number;
  } = {},
): Promise<T> {
  let currentDelay = delay;

  for (let attempt = 1; attempt <= times; attempt++) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Retry aborted', 'AbortError');

    try {
      return await fn();
    } catch (err) {
      if (attempt === times) throw err;

      if (shouldRetry && !shouldRetry(err, attempt - 1)) throw err;

      const ms = retryDelay ? retryDelay(attempt - 1) : currentDelay;

      if (ms > 0) await sleep(ms);

      if (!retryDelay) {
        currentDelay = typeof backoff === 'function' ? backoff(attempt, currentDelay) : currentDelay * backoff;
      }
    }
  }

  throw new Error('Retry failed unexpectedly');
}
