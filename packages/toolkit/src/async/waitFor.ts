/**
 * Waits for a condition to become true by polling.
 * Useful for waiting for DOM elements, API states, or other conditions.
 *
 * @example
 * ```ts
 * // Wait for an element to appear
 * await waitFor(() => document.querySelector('#myElement') !== null);
 *
 * // Wait for API to be ready
 * await waitFor(
 *   async () => {
 *     const res = await fetch('/api/health');
 *     return res.ok;
 *   },
 *   { timeout: 30000, interval: 1000 }
 * );
 * ```
 *
 * @param condition - Function that returns true when condition is met
 * @param options - Configuration options
 * @param options.timeout - Maximum time to wait in ms (default: 5000)
 * @param options.interval - Polling interval in ms (default: 100)
 * @param options.signal - AbortSignal to cancel waiting
 * @returns Promise that resolves when condition becomes true
 * @throws {Error} If timeout is reached
 * @throws {DOMException} If aborted via signal
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    signal?: AbortSignal;
  } = {},
): Promise<void> {
  const { timeout: timeoutMs = 5000, interval = 100, signal } = options;

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  return new Promise<void>((resolve, reject) => {
    const startTime = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (intervalId !== null) {
        clearTimeout(intervalId);
        intervalId = null;
      }
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const check = async () => {
      try {
        // Check if aborted
        if (signal?.aborted) {
          cleanup();
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        // Check condition
        const result = await condition();

        if (result) {
          cleanup();
          resolve();
          return;
        }

        // Check timeout
        if (Date.now() - startTime >= timeoutMs) {
          cleanup();
          reject(new Error(`waitFor timed out after ${timeoutMs}ms`));
          return;
        }

        // Schedule next check
        intervalId = setTimeout(check, interval);
      } catch (error) {
        // If the condition throws, clean up and reject
        cleanup();
        reject(error);
      }
    };

    // Set up abort listener
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    // Start checking
    check();
  });
}
