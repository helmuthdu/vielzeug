import { ArsenalError } from '../errors';
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
 * ```
 *
 * @param array - Array of items to process
 * @param callback - Async function to process each item
 * @param options - Optional options for concurrency and cancellation
 * @param [options.limit=Infinity] - Maximum number of concurrent operations. Defaults to unbounded.
 * @param [options.signal] - Optional AbortSignal to cancel processing
 * @returns Promise resolving to an ordered array of results
 * @throws {ArsenalError} If limit is less than 1
 * @throws {DOMException} If aborted via signal
 */
export async function parallel<T, R>(
  array: readonly T[],
  callback: (item: T, index: number, array: readonly T[]) => Promise<R> | R,
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<R[]> {
  const { limit = Infinity, signal } = options;

  if (limit < 1) {
    throw new ArsenalError(`parallel: limit must be at least 1, got ${limit}`);
  }

  if (signal?.aborted) {
    throw abortError(signal);
  }

  if (array.length === 0) {
    return [];
  }

  const results: R[] = new Array(array.length);
  let currentIndex = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      if (signal?.aborted) {
        throw abortError(signal);
      }

      if (currentIndex >= array.length) {
        return;
      }

      const index = currentIndex++;

      results[index] = await callback(array[index]!, index, array);
    }
  };

  const workerCount = Math.min(limit, array.length);
  const workers = Array.from({ length: workerCount }, () => worker());

  await Promise.all(workers);

  return results;
}
