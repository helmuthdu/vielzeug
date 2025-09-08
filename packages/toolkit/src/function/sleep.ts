/**
 * Creates a Promise that resolves after a specified amount of time.
 *
 * @example
 * ```ts
 * sleep(1000).then(() => console.log('Hello, world!')); // logs 'Hello, world!' after 1 second
 * ```
 *
 * @param timeout - The number of milliseconds to wait before resolving the Promise.
 *
 * @returns A Promise that resolves after the specified time.
 */
export async function sleep(timeout: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
