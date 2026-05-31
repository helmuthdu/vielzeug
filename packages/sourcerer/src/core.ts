/**
 * Shared source infrastructure: listener management, debounce scheduling, and ready() polling.
 * All source factories compose this core rather than duplicating the same patterns.
 */
export type SourceCore = {
  /** Cancels any pending timer without invoking the callback. */
  cancelTimer(): void;

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
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  return {
    cancelTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    },

    dispose() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }

      listeners.clear();
      disposed = true;
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
    },

    ready(isIdle, timeoutMs) {
      if (isIdle()) return Promise.resolve();

      return new Promise<void>((resolve, reject) => {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const check = () => {
          if (isIdle()) {
            if (timeoutId !== undefined) {
              clearTimeout(timeoutId);
            }

            listeners.delete(check);
            resolve();
          }
        };

        if (timeoutMs !== undefined) {
          timeoutId = setTimeout(() => {
            listeners.delete(check);
            reject(new Error(`Source.ready() timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }

        listeners.add(check);
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
