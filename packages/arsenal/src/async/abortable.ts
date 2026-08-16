import { abortError } from './abortError';

/**
 * Wraps any promise with AbortSignal support.
 *
 * If the signal is already aborted, the returned promise rejects immediately with the
 * signal's reason (or a generic `DOMException('Aborted', 'AbortError')`). If the signal
 * fires after wrapping, the returned promise rejects with the abort reason. If the
 * underlying promise settles first, the returned promise resolves or rejects with its
 * result and the abort listener is removed.
 *
 * The wrapped promise continues running after cancellation — `abortable` only rejects
 * the returned promise, it does not stop the underlying work. Pair with `fetch`'s
 * `signal` option for true cancellation.
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 * const task = abortable(fetch('/api'), controller.signal);
 * controller.abort(); // task rejects with AbortError
 * ```
 *
 * @param promise - The promise to make abort-aware.
 * @param signal - The AbortSignal to observe.
 * @returns A promise that rejects when the signal aborts, or settles with the original promise.
 */
export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(abortError(signal));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError(signal));

    signal.addEventListener('abort', onAbort, { once: true });

    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => signal.removeEventListener('abort', onAbort));
  });
}
