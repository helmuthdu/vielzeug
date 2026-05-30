import { sleep } from './sleep';

export type WaitForOptions = {
  interval?: number;
  signal?: AbortSignal;
  timeout?: number;
};

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
 *   { timeout: 30000, interval: 1000 },
 * );
 * ```
 *
 * @param condition - Function that returns true when condition is met
 * @param options - Configuration options
 * @param [options.timeout=5000] - Maximum time to wait in ms
 * @param [options.interval=100] - Polling interval in ms
 * @param [options.signal] - AbortSignal to cancel waiting
 * @returns Promise that resolves when condition becomes true
 * @throws Rejects with the abort reason when timed out or cancelled
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  { interval = 100, signal, timeout: ms = 5000 }: WaitForOptions = {},
): Promise<void> {
  const deadline = AbortSignal.timeout(ms);
  const merged = signal ? AbortSignal.any([signal, deadline]) : deadline;

  merged.throwIfAborted();

  while (true) {
    if (await condition()) return;

    merged.throwIfAborted();
    await sleep(interval);
    merged.throwIfAborted();
  }
}
