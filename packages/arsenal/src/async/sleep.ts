import { abortError } from './abortError';

/**
 * Creates a Promise that resolves after a specified amount of time.
 * If an `AbortSignal` is provided and fires before the delay elapses, the promise rejects with
 * the signal's reason (or a generic `DOMException('Aborted', 'AbortError')`).
 *
 * @example
 * ```ts
 * sleep(1000).then(() => console.log('Hello, world!')); // logs after 1 second
 *
 * // With abort support
 * const controller = new AbortController();
 * await sleep(5000, controller.signal); // rejects immediately when aborted
 * ```
 *
 * @param timeout - The number of milliseconds to wait before resolving the Promise.
 * @param signal  - Optional AbortSignal to cancel the sleep early.
 *
 * @returns A Promise that resolves after the specified time.
 *
 * @throws {TypeError} If timeout is not a non-negative number.
 */
export async function sleep(timeout: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
  }

  if (signal.aborted) {
    return Promise.reject(abortError(signal));
  }

  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, timeout);

    const onAbort = () => {
      clearTimeout(id);
      signal.removeEventListener('abort', onAbort);
      reject(abortError(signal));
    };

    signal.addEventListener('abort', onAbort);
  });
}
