/**
 * Async waiting utilities for test environments.
 */

import { OreTimeoutError } from '../errors';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WaitOptions {
  /** Maximum wait time in ms (default: 1000) */
  timeout?: number;
  /** Polling interval in ms (default: 50) */
  interval?: number;
  /** Message included in timeout error */
  message?: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Poll until a callback returns truthy (or void) without throwing.
 * Supports both boolean conditions and `expect()` assertions.
 *
 * - Returns truthy → success
 * - Returns `undefined` (e.g. bare `expect()` call) → success
 * - Returns falsy value → retry
 * - Throws → retry, re-throw original error on timeout
 *
 * @example
 * await waitFor(() => query('.status')?.textContent === 'loaded');
 * await waitFor(() => expect(count).toBe(3));
 */
export async function waitFor(
  fn: () => unknown,
  { interval = 50, message, timeout = 1000 }: WaitOptions = {},
): Promise<void> {
  const deadline = Date.now() + timeout;
  let lastError: unknown;

  const attempt = async (): Promise<boolean> => {
    try {
      const result = await fn();

      return result === undefined || !!result;
    } catch (e) {
      lastError = e;

      return false;
    }
  };

  while (Date.now() < deadline) {
    if (await attempt()) return;

    await new Promise((r) => setTimeout(r, interval));
  }

  if (await attempt()) return;

  const base = message ?? `waitFor timed out after ${timeout}ms`;

  if (lastError instanceof Error) {
    lastError.message = `${base}\n${lastError.message}`;
    throw lastError;
  }

  throw new OreTimeoutError(lastError != null ? `${base}\nCause: ${lastError}` : base);
}

/**
 * Resolve when the target element emits the given event.
 *
 * @example
 * const promise = waitForEvent(el, 'change');
 * fire.click(trigger);
 * const event = await promise;
 */
export function waitForEvent<T extends Event = Event>(element: Element, name: string, timeout = 1000): Promise<T> {
  return new Promise((resolve, reject) => {
    const onEvent = (e: Event): void => {
      clearTimeout(timer);
      resolve(e as T);
    };
    const timer = setTimeout(() => {
      element.removeEventListener(name, onEvent);
      reject(new OreTimeoutError(`waitForEvent: "${name}" timed out after ${timeout}ms`));
    }, timeout);

    element.addEventListener(name, onEvent, { once: true });
  });
}
