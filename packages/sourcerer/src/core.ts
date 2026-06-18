import { SourceDisposedError, SourceTimeoutError } from './types';

/**
 * Shared source infrastructure: listener management, debounce scheduling, and ready() polling.
 * All source factories compose this core rather than duplicating the same patterns.
 */
export type SourceCore = {
  /** Cancels any pending timer without invoking the callback. */
  cancelTimer(): void;

  /** `AbortSignal` that is aborted when `dispose()` is called. */
  readonly disposalSignal: AbortSignal;

  /**
   * Clears all listeners, cancels any pending timer, and marks the core as disposed.
   * Subsequent method calls on the core become no-ops.
   */
  dispose(): void;

  /**
   * If a timer is scheduled, cancels it and immediately invokes `fn`.
   * Returns a resolved Promise when no timer is pending.
   */
  flush(fn: () => Promise<void>): Promise<void>;

  /** Whether `dispose()` has been called. All methods become no-ops after disposal. */
  readonly isDisposed: boolean;

  /** Whether a debounce timer is currently scheduled (drives `meta.isSearchPending`). */
  readonly isScheduled: boolean;

  /** Fire all registered listeners. */
  notify(): void;

  /**
   * Returns a Promise that resolves when `isIdle()` returns true.
   * Resolves synchronously if already idle.
   * Rejects with a `TimeoutError` after `timeoutMs` ms if still not idle.
   */
  ready(isIdle: () => boolean, timeoutMs?: number): Promise<void>;

  /**
   * Schedules a debounced callback, replacing any pending timer.
   * The callback is invoked after `delayMs` ms of inactivity.
   */
  schedule(fn: () => void, delayMs: number): void;

  /** Subscribe to change notifications. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
};

export function createSourceCore(): SourceCore {
  const listeners = new Set<() => void>();
  const readyWaiters = new Set<{
    check: () => void;
    reject: (err: unknown) => void;
    timeoutId?: ReturnType<typeof setTimeout>;
  }>();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  return {
    cancelTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    },

    get disposalSignal() {
      return controller.signal;
    },

    dispose() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }

      for (const waiter of readyWaiters) {
        if (waiter.timeoutId !== undefined) clearTimeout(waiter.timeoutId);

        waiter.reject(new SourceDisposedError());
      }

      readyWaiters.clear();
      listeners.clear();
      disposed = true;
      controller.abort();
    },

    flush(fn) {
      if (!timer) return Promise.resolve();

      clearTimeout(timer);
      timer = undefined;

      return fn();
    },

    get isDisposed() {
      return disposed;
    },

    get isScheduled() {
      return timer !== undefined;
    },

    notify() {
      if (disposed) return;

      for (const listener of listeners) {
        listener();
      }

      for (const waiter of readyWaiters) {
        waiter.check();
      }
    },

    ready(isIdle, timeoutMs) {
      if (disposed) return Promise.reject(new SourceDisposedError());

      if (isIdle()) return Promise.resolve();

      return new Promise<void>((resolve, reject) => {
        const waiter: { check: () => void; reject: (err: unknown) => void; timeoutId?: ReturnType<typeof setTimeout> } =
          {
            check: () => {
              if (isIdle()) {
                if (waiter.timeoutId !== undefined) clearTimeout(waiter.timeoutId);

                readyWaiters.delete(waiter);
                resolve();
              }
            },
            reject,
          };

        if (timeoutMs !== undefined) {
          waiter.timeoutId = setTimeout(() => {
            readyWaiters.delete(waiter);
            reject(new SourceTimeoutError(timeoutMs));
          }, timeoutMs);
        }

        readyWaiters.add(waiter);
      });
    },

    schedule(fn, delayMs) {
      if (disposed) return;

      if (timer) clearTimeout(timer);

      timer = setTimeout(() => {
        timer = undefined;
        fn();
      }, delayMs);
    },

    subscribe(listener) {
      if (disposed) return () => {};

      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}
