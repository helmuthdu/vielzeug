/**
 * Async waiting utilities for test environments.
 */

import { AssayTimeoutError } from './errors';

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
 * - Throws → retry
 *
 * Always rejects with `AssayTimeoutError` on timeout, regardless of which of the two retry
 * reasons above was last observed — `instanceof AssayTimeoutError` is a reliable way to catch
 * "the condition never became true" without caring whether the last attempt returned falsy or
 * threw. The original failure (an assertion's message, a thrown error) is preserved as `.cause`,
 * not merged into a mutated copy of it — `fn`'s thrown errors are caller-owned and never mutated.
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

  // Single loop, one `fn()` call site — always tries once more before checking the deadline,
  // so a condition that becomes true exactly as the timeout elapses still succeeds.
  for (;;) {
    try {
      const result = await fn();

      if (result === undefined || result) return;
    } catch (e) {
      lastError = e;
    }

    if (Date.now() >= deadline) break;

    await wait(interval);
  }

  // The default timing summary always appears — a custom `message` adds context in front of it
  // rather than replacing it, so a debugging session never loses "how long did this actually wait".
  const timing = `waitFor timed out after ${timeout}ms`;
  const base = message ? `${message} (${timing})` : timing;
  const cause = lastError instanceof Error ? lastError.message : lastError != null ? String(lastError) : undefined;

  throw new AssayTimeoutError(cause ? `${base}\n${cause}` : base, { cause: lastError });
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
      reject(new AssayTimeoutError(`waitForEvent: "${name}" timed out after ${timeout}ms`));
    }, timeout);

    element.addEventListener(name, onEvent, { once: true });
  });
}

/**
 * Resolves after one microtask tick (`queueMicrotask`). Use to wait for reactivity (signal
 * effects, promise-chain continuations) to settle without moving into the macrotask queue —
 * cheaper and more precise than `wait(0)`, which yields to a full `setTimeout` turn instead.
 */
export const nextTick = (): Promise<void> =>
  new Promise((resolve) => {
    queueMicrotask(resolve);
  });

/**
 * Resolves after `ms` milliseconds. Prefer `nextTick()` for reactive updates and `waitFor()`
 * for polling a condition — reach for this only when a real macrotask delay is what the code
 * under test actually depends on (e.g. a debounce timer).
 */
export const wait = (ms = 0): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
