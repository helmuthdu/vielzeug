import { sleep } from './sleep';

/**
 * Retries an asynchronous function with optional per-attempt delay strategy.
 *
 * @example
 * ```ts
 * retry(() => fetchData(), { times: 3, delay: (attempt) => attempt * 250, signal: abortSignal })
 *   .then(result => console.log(result))
 *   .catch(error => console.error(error));
 * ```
 *
 * @param fn - The asynchronous function to retry.
 * @param options - (optional) Options for retrying the function.
 * @param [options.times=3] - Total number of attempts (including the first).
 * @param [options.delay=250] - Delay in milliseconds or a function that receives the failure count (0-based).
 * @param [options.signal] - `AbortSignal` to cancel retries; throws the signal's `reason` on abort.
 * @param [options.shouldRetry] - Return `false` to stop retrying immediately for a specific error. `attempt` is 0-based failure count.
 *
 * @returns The result of the asynchronous function.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    delay?: number | ((attempt: number) => number);
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    signal?: AbortSignal;
    times?: number;
  } = {},
): Promise<T> {
  const { delay = 250, shouldRetry, signal, times = 3 } = options;

  for (let attempt = 1; attempt <= times; attempt++) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Retry aborted', 'AbortError');

    try {
      return await fn();
    } catch (err) {
      if (attempt === times) throw err;

      if (shouldRetry && !shouldRetry(err, attempt - 1)) throw err;

      const ms = typeof delay === 'function' ? delay(attempt - 1) : delay;

      if (ms > 0) await sleep(ms);
    }
  }

  throw new Error('Retry failed unexpectedly');
}
