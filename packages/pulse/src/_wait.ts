import type { Unsubscribe } from './types';

import { combineSignals } from './_utils';
import { PulseAbortError, PulseTimeoutError } from './errors';

/**
 * Shared implementation for `pulse.wait()` and `channel.wait()`.
 * Resolves on the next event dispatched via `subscribe`, or rejects when
 * the combined signal aborts or the optional timeout elapses.
 *
 * @internal
 */
export function createWaitPromise<T>(
  event: string,
  baseSignal: AbortSignal,
  opts: { signal?: AbortSignal; timeout?: number } | undefined,
  subscribe: (event: string, handler: (payload: unknown) => void) => Unsubscribe,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const signals: AbortSignal[] = [baseSignal];

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (opts?.signal) signals.push(opts.signal);

    if (opts?.timeout !== undefined) {
      const timeoutCtrl = new AbortController();

      timeoutId = setTimeout(() => {
        timeoutCtrl.abort(new PulseTimeoutError(event));
      }, opts.timeout);
      signals.push(timeoutCtrl.signal);
    }

    const combined = signals.length === 1 ? signals[0]! : combineSignals(signals[0]!, ...signals.slice(1));

    if (combined.aborted) {
      clearTimeout(timeoutId);
      reject(combined.reason instanceof PulseTimeoutError ? combined.reason : new PulseAbortError());

      return;
    }

    let unsub: Unsubscribe = () => {};

    const onAbort = (): void => {
      clearTimeout(timeoutId);
      unsub();
      reject(combined.reason instanceof PulseTimeoutError ? combined.reason : new PulseAbortError());
    };

    combined.addEventListener('abort', onAbort, { once: true });

    unsub = subscribe(event, (payload) => {
      clearTimeout(timeoutId);
      combined.removeEventListener('abort', onAbort);
      resolve(payload as T);
    });
  });
}
