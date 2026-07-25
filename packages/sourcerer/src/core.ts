import { SourcererDisposedError, SourcererTimeoutError } from './errors';

/**
 * Shared source infrastructure: change notification, debounce scheduling, and ready() polling.
 * All source factories compose this core rather than duplicating the same patterns.
 *
 * Change notification is a plain `Set<listener>` — deliberately NOT `@vielzeug/ripple`, despite
 * that being the repo-wide convention for "reactive" packages. Tried it; reverted. Two concrete
 * problems, not just aesthetics:
 *
 * 1. `prefetchSource()`/`prefetchSourceAndKeep()` are explicitly documented for SSR, and every
 *    source factory routes through this file's `signal`-backed notify. Ripple's own scheduler
 *    warns that its module-level flush queue is shared across concurrent requests in Node.js
 *    unless the caller opts into `@vielzeug/ripple/ssr`'s per-request isolation — a real,
 *    unaddressed risk in exactly the code path meant to run on a server handling concurrent
 *    requests.
 * 2. `subscribe()`'s public contract is "fire on every notify()", not per-field reactivity —
 *    ripple's dependency-tracking machinery (a real subscription object per `watch()` call)
 *    buys nothing over a bare `Set.add()` for that contract, since there's exactly one thing
 *    ever being watched (an internal version counter, not real data).
 *
 * `current`/`meta` themselves were never ripple signals either way — the public shape has
 * always been plain getters + `subscribe()`, framework-agnostic by design (see `types.ts`'s
 * `ReactiveSource` doc comment). Nothing about restoring a plain `Set` changes that contract.
 *
 * Debounce scheduling and `ready()`'s "resolve when idle, with a timeout" polling were never
 * ripple's job either way: ripple is a dependency-tracking signal system ("notify when a value
 * changes"), not an async-coordination library ("wait for a condition, with a timeout, and
 * reject if disposed first").
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

  /**
   * Fire all registered listeners and wake any `ready()` waiters.
   * When provided, `onBefore` runs once before listeners are called — use it to
   * refresh cached meta/current before subscribers observe the new state.
   */
  notify(onBefore?: () => void): void;

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

export function createSourceCore(opts?: { onBeforeNotify?: () => void }): SourceCore {
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

        waiter.reject(new SourcererDisposedError());
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

    notify(onBefore?: () => void) {
      if (disposed) return;

      (onBefore ?? opts?.onBeforeNotify)?.();

      for (const listener of listeners) {
        listener();
      }

      for (const waiter of readyWaiters) {
        waiter.check();
      }
    },

    ready(isIdle, timeoutMs) {
      if (disposed) return Promise.reject(new SourcererDisposedError());

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
            reject(new SourcererTimeoutError(timeoutMs));
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
