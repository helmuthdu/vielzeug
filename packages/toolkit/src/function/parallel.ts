/**
 * Processes an array with an async callback with controlled parallelism.
 * Similar to Promise.all, but limits how many items are processed concurrently.
 * Returns an ordered array of results.
 *
 * @example
 * ```ts
 * // Process 3 items at a time
 * const results = await parallel(3, [1, 2, 3, 4, 5], async (n) => {
 *   await delay(100);
 *   return n * 2;
 * });
 * // [2, 4, 6, 8, 10]
 *
 * // With abort signal
 * const controller = new AbortController();
 * const results = await parallel(2, items, async (item) => {
 *   return processItem(item);
 * }, controller.signal);
 * ```
 *
 * @param limit - Maximum number of concurrent operations (must be >= 1)
 * @param array - Array of items to process
 * @param callback - Async function to process each item
 * @param signal - Optional AbortSignal to cancel processing
 * @returns Promise resolving to an ordered array of results
 * @throws {Error} If limit is less than 1
 * @throws {DOMException} If aborted via signal
 */
export async function parallel<T, R>(
  limit: number,
  array: T[],
  callback: (item: T, index: number, array: T[]) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  if (limit < 1) {
    throw new Error('Limit must be at least 1');
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const results: R[] = new Array(array.length);
  let currentIndex = 0;
  let hasError = false;
  let error: unknown;

  // Check for abort
  const checkAbort = () => {
    if (signal?.aborted) {
      hasError = true;
      error = new DOMException('Aborted', 'AbortError');
      return true;
    }
    return false;
  };

  // Worker function that processes items from the queue
  const worker = async (): Promise<void> => {
    while (currentIndex < array.length && !hasError) {
      if (checkAbort()) {
        break;
      }

      const index = currentIndex++;

      try {
        results[index] = await callback(array[index], index, array);
      } catch (err) {
        hasError = true;
        error = err;
        break;
      }
    }
  };

  // Create workers up to the limit
  const workers: Promise<void>[] = [];
  const workerCount = Math.min(limit, array.length);

  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  // Wait for all workers to complete
  await Promise.all(workers);

  // If there was an error, throw it
  if (hasError) {
    throw error;
  }

  return results;
}
