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
 * @throws {unknown} Rejects with the merged AbortSignal reason (timeout or abort)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    interval?: number;
    signal?: AbortSignal;
    timeout?: number;
  } = {},
): Promise<void> {
  const { interval = 100, signal, timeout: timeoutMs = 5000 } = options;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const mergedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  mergedSignal.throwIfAborted();

  return new Promise<void>((resolve, reject) => {
    let intervalId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (intervalId !== null) {
        clearTimeout(intervalId);
        intervalId = null;
      }

      mergedSignal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(mergedSignal.reason);
    };

    const check = async () => {
      try {
        if (mergedSignal.aborted) {
          cleanup();
          reject(mergedSignal.reason);

          return;
        }

        const result = await condition();

        if (result) {
          cleanup();
          resolve();

          return;
        }

        intervalId = setTimeout(check, interval);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    mergedSignal.addEventListener('abort', onAbort, { once: true });

    // Start checking
    check();
  });
}
