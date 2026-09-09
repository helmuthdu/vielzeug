import { abortError } from '@vielzeug/arsenal';

import { AssayTimeoutError } from './errors';

export interface DelayOptions {
  signal?: AbortSignal;
}

export interface WaitOptions {
  /** Polling interval in ms (default: 50). */
  interval?: number;
  /** Cancel the pending wait. */
  signal?: AbortSignal;
  /** Maximum wait time in ms (default: 1000). */
  timeout?: number;
}

export interface EventuallyOptions extends WaitOptions {
  /** Context included in the timeout error. */
  message?: string;
}

const DEADLINE = Symbol('assay.deadline');
const MAX_TIMER_MS = 2_147_483_647;
const now = (): number => performance.now();

const validateDuration = (name: string, value: number, allowZero: boolean): void => {
  if (!Number.isFinite(value) || value > MAX_TIMER_MS || (allowZero ? value < 0 : value <= 0)) {
    throw new RangeError(
      `${name} must be a ${allowZero ? 'non-negative' : 'positive'} finite number no greater than ${MAX_TIMER_MS}`,
    );
  }
};

const validateWait = (interval: number, timeout: number): void => {
  validateDuration('interval', interval, false);
  validateDuration('timeout', timeout, true);
};

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal, 'The operation was aborted.'));
      return;
    }

    const timer = setTimeout(done, ms);

    function done(): void {
      signal?.removeEventListener('abort', abort);
      resolve();
    }

    function abort(): void {
      clearTimeout(timer);
      reject(abortError(signal, 'The operation was aborted.'));
    }

    signal?.addEventListener('abort', abort, { once: true });
  });

const runBounded = <T>(run: () => T | Promise<T>, deadline: number, signal?: AbortSignal): Promise<T> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal, 'The operation was aborted.'));
      return;
    }

    let settled = false;
    const cleanup = (): boolean => {
      if (settled) return false;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      return true;
    };
    const resolveOnce = (value: T): void => {
      if (cleanup()) resolve(value);
    };
    const rejectOnce = (error: unknown): void => {
      if (cleanup()) reject(error);
    };
    const timer = setTimeout(() => rejectOnce(DEADLINE), Math.max(0, deadline - now()));
    const abort = () => rejectOnce(abortError(signal, 'The operation was aborted.'));

    signal?.addEventListener('abort', abort, { once: true });

    try {
      Promise.resolve(run()).then(resolveOnce, rejectOnce);
    } catch (error) {
      rejectOnce(error);
    }
  });

export const delay = (ms = 0, options: DelayOptions = {}): Promise<void> => {
  validateDuration('ms', ms, true);
  return sleep(ms, options.signal);
};

export const nextTick = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve));

export async function waitUntil(
  predicate: () => boolean | Promise<boolean>,
  { interval = 50, signal, timeout = 1000 }: WaitOptions = {},
): Promise<void> {
  validateWait(interval, timeout);
  const deadline = now() + timeout;
  let first = true;

  for (;;) {
    if (signal?.aborted) throw abortError(signal, 'The operation was aborted.');
    if (!first && now() >= deadline) throw new AssayTimeoutError(`waitUntil timed out after ${timeout}ms`);
    first = false;

    let matched: boolean;
    try {
      matched = await runBounded(predicate, deadline, signal);
    } catch (error) {
      if (error === DEADLINE) throw new AssayTimeoutError(`waitUntil timed out after ${timeout}ms`);
      throw error;
    }
    if (matched) return;

    const remaining = deadline - now();
    if (remaining <= 0) throw new AssayTimeoutError(`waitUntil timed out after ${timeout}ms`);
    await sleep(Math.min(interval, remaining), signal);
  }
}

/**
 * Retry an assertion until it stops throwing or the timeout elapses.
 *
 * Polls the assertion on a fixed interval and preserves the last failure as the
 * timeout cause. Pending asynchronous assertions remain bounded by the same
 * deadline. Use `waitUntil()` for boolean conditions, `delay()` for explicit
 * timer dependencies, and `nextTick()` for one queued microtask boundary.
 *
 * @example
 * await eventually(() => expect(region.textContent).toBe('Saved'));
 */
export async function eventually(
  assertion: () => void | Promise<void>,
  { interval = 50, message, signal, timeout = 1000 }: EventuallyOptions = {},
): Promise<void> {
  validateWait(interval, timeout);
  const deadline = now() + timeout;
  let first = true;
  let lastError: unknown;

  for (;;) {
    if (signal?.aborted) throw abortError(signal, 'The operation was aborted.');
    if (!first && now() >= deadline) break;
    first = false;

    try {
      await runBounded(assertion, deadline, signal);
      return;
    } catch (error) {
      if (signal?.aborted) throw abortError(signal, 'The operation was aborted.');
      if (error === DEADLINE) break;
      lastError = error;
    }

    const remaining = deadline - now();
    if (remaining <= 0) break;
    await sleep(Math.min(interval, remaining), signal);
  }

  const timing = `eventually timed out after ${timeout}ms`;
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
  validateDuration('timeout', timeout, true);

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal, 'The operation was aborted.'));
      return;
    }

    const dispose = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      target.removeEventListener(type, onEvent);
    };
    const onEvent = (event: Event): void => {
      dispose();
      resolve(event as T);
    };
    const timer = setTimeout(() => {
      dispose();
      reject(new AssayTimeoutError(`waitForEvent: "${type}" timed out after ${timeout}ms`));
    }, timeout);
    const onAbort = () => {
      dispose();
      reject(abortError(signal, 'The operation was aborted.'));
    };

    target.addEventListener(type, onEvent, { once: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
