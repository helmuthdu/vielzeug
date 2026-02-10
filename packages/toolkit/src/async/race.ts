/**
 * Race multiple promises but with a guaranteed minimum delay.
 * Useful for showing loading states for at least a minimum duration.
 *
 * @example
 * ```ts
 * // Show loading spinner for at least 500ms
 * const result = await race(
 *   fetchData(),
 *   500
 * );
 *
 * // With multiple promises
 * const result = await race(
 *   [fetch('/api/1'), fetch('/api/2')],
 *   1000
 * );
 * ```
 *
 * @param promises - Single promise or array of promises to race
 * @param minDelay - Minimum delay in milliseconds before resolving
 * @returns Promise that resolves with the first result after the minimum delay
 */
export async function race<T>(promises: Promise<T> | Promise<T>[], minDelay: number): Promise<T> {
  const promiseArray = Array.isArray(promises) ? promises : [promises];
  const minDelayPromise = new Promise<void>((resolve) => setTimeout(resolve, minDelay));

  const result = await Promise.race(promiseArray);
  await minDelayPromise;

  return result;
}
