import { AssayTimeoutError } from './errors';

export interface WaitOptions {
  /** Polling interval in ms (default: 50). */
  interval?: number;
  /** Cancel the pending wait. */
  signal?: AbortSignal;
  /** Maximum wait time in ms (default: 1000). */
  timeout?: number;
}

export interface RetryOptions extends WaitOptions {
  /** Context included in the timeout error. */
  message?: string;
}

export interface DelayOptions {
  /** Cancel the pending delay. */
  signal?: AbortSignal;
}

const abortReason = (signal: AbortSignal): unknown =>
  signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');

/**
 * Resolve after `ms` milliseconds. Rejects with the abort reason when cancelled.
 */
export const delay = (ms = 0, { signal }: DelayOptions = {}): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));

      return;
    }

    const timer = setTimeout(done, ms);

    function done(): void {
      signal?.removeEventListener('abort', abort);
      resolve();
    }

    function abort(): void {
      clearTimeout(timer);
      reject(abortReason(signal!));
    }

    signal?.addEventListener('abort', abort, { once: true });
  });

/** Poll until a synchronous or asynchronous predicate returns `true`. */
export async function waitUntil(
  predicate: () => boolean | Promise<boolean>,
  { interval = 50, signal, timeout = 1000 }: WaitOptions = {},
): Promise<void> {
  const deadline = Date.now() + timeout;

  for (;;) {
    if (signal?.aborted) throw abortReason(signal);

    if (await predicate()) return;

    if (Date.now() >= deadline) break;

    await delay(interval, { signal });
  }

  throw new AssayTimeoutError(`waitUntil timed out after ${timeout}ms`);
}

/** Retry an assertion until it stops throwing. */
export async function retry(
  assertion: () => void | Promise<void>,
  { interval = 50, message, signal, timeout = 1000 }: RetryOptions = {},
): Promise<void> {
  const deadline = Date.now() + timeout;
  let lastError: unknown;

  for (;;) {
    if (signal?.aborted) throw abortReason(signal);

    try {
      await assertion();

      return;
    } catch (error) {
      lastError = error;
    }

    if (Date.now() >= deadline) break;

    await delay(interval, { signal });
  }

  const timing = `retry timed out after ${timeout}ms`;
  const context = message ? `${message} (${timing})` : timing;
  const detail = lastError instanceof Error ? lastError.message : lastError == null ? '' : String(lastError);

  throw new AssayTimeoutError(detail ? `${context}\n${detail}` : context, { cause: lastError });
}

/** Resolve with the next event of `type`, or reject when it times out or is aborted. */
export function waitForEvent<T extends Event = Event>(
  target: EventTarget,
  type: string,
  { signal, timeout = 1000 }: Omit<WaitOptions, 'interval'> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));

      return;
    }

    const dispose = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      target.removeEventListener(type, onEvent);
    };
    const onEvent = (e: Event): void => {
      dispose();
      resolve(e as T);
    };
    const timer = setTimeout(() => {
      dispose();
      reject(new AssayTimeoutError(`waitForEvent: "${type}" timed out after ${timeout}ms`));
    }, timeout);
    const onAbort = () => {
      dispose();
      reject(abortReason(signal!));
    };

    target.addEventListener(type, onEvent, { once: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Resolve after one microtask tick. */
export const nextTick = (): Promise<void> =>
  new Promise((resolve) => {
    queueMicrotask(resolve);
  });
