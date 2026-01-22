import { Logit } from '@vielzeug/logit';
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
 * @param [options.times=3] - The number of retry attempts.
 * @param [options.delay=250] - The delay in milliseconds between retries.
 * @param [options.backoff=1] - Exponential backoff factor (default: 1 → no backoff).
 * @param [options.signal] - `AbortSignal` to allow canceling retries.
 *
 * @returns The result of the asynchronous function.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  {
    times = 3,
    delay = 250,
    backoff = 1,
    signal,
  }: {
    times?: number;
    delay?: number;
    backoff?: number;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  let currentDelay = delay;

  for (let attempt = 1; attempt <= times; attempt++) {
    if (signal?.aborted) {
      Logit.warn(`retry() -> Aborted after ${attempt - 1} attempts`);
      throw new Error('Retry aborted');
    }

    try {
      return await fn();
    } catch (err) {
      if (attempt === times) throw err;

      Logit.warn(`retry() -> ${err}, attempt ${attempt}/${times}, retrying in ${currentDelay}ms`);
      if (currentDelay > 0) await sleep(currentDelay);
      currentDelay *= backoff;
    }
  }

  throw new Error('Retry failed unexpectedly');
}
