/**
 * Races a promise against a minimum delay, ensuring the result is not returned
 * before the minimum duration has elapsed. Useful for preventing loading flicker.
 *
 * @example
 * ```ts
 * // Show loading spinner for at least 500ms
 * const result = await race(fetchData(), 500);
 * ```
 *
 * @param promise - The promise to race
 * @param minDelay - Minimum delay in milliseconds before resolving
 * @returns Promise that resolves with the result after the minimum delay
 */
export async function race<T>(promise: Promise<T>, minDelay: number): Promise<T> {
  const minDelayPromise = new Promise<void>((resolve) => setTimeout(resolve, minDelay));

  const result = await promise;

  await minDelayPromise;

  return result;
}
