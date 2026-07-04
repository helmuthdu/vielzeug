import { ArsenalValidationError } from '../errors';
import { abortError } from './abortError';

/**
 * Processes an array with an async callback with controlled parallelism.
 * Similar to Promise.all, but limits how many items are processed concurrently.
 * Returns an ordered array of results.
 *
 * @example
 * ```ts
 * // Process 3 items at a time
 * const results = await parallel([1, 2, 3, 4, 5], async (n) => {
 *   await delay(100);
 *   return n * 2;
 * }, { limit: 3 });
 * // [2, 4, 6, 8, 10]
 *
 * // With abort signal
 * const controller = new AbortController();
 * const results = await parallel(items, async (item) => {
 *   return processItem(item);
 * }, { limit: 2, signal: controller.signal });
 *
 * // Stop other workers as soon as one item fails
 * await parallel(items, riskyOperation, { abortOnError: true, limit: 3 });
 * ```
 *
 * @param array - Array of items to process
 * @param callback - Async function to process each item
 * @param options - Optional options for concurrency and cancellation
 * @param [options.limit=Infinity] - Maximum number of concurrent operations. Defaults to unbounded.
 * @param [options.signal] - Optional AbortSignal to cancel processing
 * @param [options.abortOnError=false] - When `true`, stops other in-flight workers as soon as any
 *   callback throws, instead of letting them keep running to completion unobserved. Default
 *   preserves the existing best-effort-completion behavior.
 * @returns Promise resolving to an ordered array of results
 * @throws {ArsenalValidationError} If limit is less than 1
 * @throws {DOMException} If aborted via signal
 */
export async function parallel<T, R>(
  array: readonly T[],
  callback: (item: T, index: number, array: readonly T[]) => Promise<R> | R,
  options: { abortOnError?: boolean; limit?: number; signal?: AbortSignal } = {},
): Promise<R[]> {
  const { abortOnError = false, limit = Infinity, signal } = options;

  if (limit < 1) {
    throw new ArsenalValidationError(`parallel: limit must be at least 1, got ${limit}`);
  }

  if (signal?.aborted) {
    throw abortError(signal);
  }

  if (array.length === 0) {
    return [];
  }

  const results: R[] = new Array(array.length);
  let currentIndex = 0;
  const failFastController = abortOnError ? new AbortController() : undefined;

  const worker = async (): Promise<void> => {
    while (true) {
      if (signal?.aborted) {
        throw abortError(signal);
      }

      if (failFastController?.signal.aborted) {
        return;
      }

      if (currentIndex >= array.length) {
        return;
      }

      const index = currentIndex++;

      try {
        results[index] = await callback(array[index]!, index, array);
      } catch (err) {
        failFastController?.abort();
        throw err;
      }
    }
  };

  const workerCount = Math.min(limit, array.length);
  const workers = Array.from({ length: workerCount }, () => worker());

  await Promise.all(workers);

  return results;
}
