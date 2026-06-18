import { createSourceCore } from './core';
import { createFetchManager } from './fetchManager';
import { defaultKeyOf, defaultRetryDelay } from './utils';

/**
 * Configuration subset common to all async source types.
 * Extracted to eliminate duplication across remote, cursor, and infinite sources.
 */
export type AsyncSourceConfig<TQuery> = Readonly<{
  autoFetch?: boolean;
  debounceMs?: number;
  queryKey?: (q: TQuery) => string;
  refreshInterval?: number;
  retry?: { attempts?: number; delay?: (attempt: number) => number };
}>;

type FetchExecutor<TQuery> = (q: TQuery, signal: AbortSignal, isLatest: () => boolean) => Promise<void>;

type AsyncSourceInfra<TQuery> = {
  [Symbol.dispose](): void;
  /** `true` when `autoFetch !== false`. */
  readonly autoFetch: boolean;
  /** Cancel any pending debounce timer. */
  cancelTimer(): void;
  /** Debounce delay in ms. */
  readonly debounceMs: number;
  /** `AbortSignal` aborted when `dispose()` is called. */
  readonly disposalSignal: AbortSignal;
  /** Dispose lifecycle: cancel refresh interval, dispose FM, dispose core. Idempotent. */
  dispose(): void;
  /** `true` after `dispose()`. */
  readonly disposed: boolean;
  /**
   * Run a deduplicated fetch for query `q`.
   * Calls `onCommit()` whenever pending count changes (for subscriber notification).
   */
  fetch(q: TQuery, execute: FetchExecutor<TQuery>, onCommit: () => void): Promise<void>;
  /** Flush any pending debounce timer, immediately invoking `doUpdate`. */
  flush(doUpdate: () => Promise<void>): Promise<void>;
  /** `true` when a debounce timer is scheduled. */
  isScheduled(): boolean;
  /** Trigger the core notify, unblocking any ready() waiters. */
  notify(): void;
  /** Number of currently in-flight requests. */
  pendingCount(): number;
  /** Resolves when idle (no in-flight requests, no pending debounce). */
  ready(timeout?: number): Promise<void>;
  /** Number of retry attempts after the first failure. */
  readonly retryAttempts: number;
  /** Returns the delay in ms before the nth retry. */
  readonly retryDelay: (attempt: number) => number;
  /** Schedule `fn` to run after `delayMs` ms, cancelling any prior scheduled call. */
  schedule(fn: () => void, delayMs: number): void;
  /**
   * Wire the refresh interval. Must be called once after construction, passing
   * the source-level `doUpdate` callback. Does nothing when `refreshInterval`
   * is unset or ≤ 0.
   */
  startRefreshInterval(doUpdate: () => void): void;
  /** Subscribe to change notifications. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
};

/**
 * Creates the shared infrastructure used by `createRemoteSource`, `createCursorSource`,
 * and `createInfiniteSource`. Eliminates duplication of lifecycle, config-defaults,
 * fetch-manager setup, dispose, ready, flush, and refresh-interval logic.
 *
 * Each source factory composes this and adds its own query state, meta shape, and
 * source-specific methods.
 */
export function createAsyncSource<TQuery>(
  cfg: AsyncSourceConfig<TQuery>,
  keyOf: (q: TQuery) => string = defaultKeyOf as (q: TQuery) => string,
): AsyncSourceInfra<TQuery> {
  const core = createSourceCore();
  const fm = createFetchManager<TQuery>(keyOf);
  const debounceMs = cfg.debounceMs ?? 300;
  const retryAttempts = cfg.retry?.attempts ?? 0;
  const retryDelay = cfg.retry?.delay ?? defaultRetryDelay;
  const autoFetch = cfg.autoFetch !== false;

  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  const dispose = (): void => {
    if (core.isDisposed) return;

    if (refreshTimer !== undefined) {
      clearInterval(refreshTimer);
      refreshTimer = undefined;
    }

    fm.dispose();
    core.dispose();
  };

  return {
    autoFetch,
    cancelTimer: () => core.cancelTimer(),
    debounceMs,
    get disposalSignal() {
      return core.disposalSignal;
    },

    dispose,

    get disposed() {
      return core.isDisposed;
    },

    fetch(q, execute, onCommit) {
      return fm.run(q, execute, onCommit);
    },

    flush(doUpdate) {
      return core.flush(doUpdate);
    },

    isScheduled: () => core.isScheduled,

    notify: () => core.notify(),

    pendingCount: () => fm.pendingCount,

    ready(timeout) {
      return core.ready(() => fm.pendingCount === 0 && !core.isScheduled, timeout);
    },
    retryAttempts,

    retryDelay,

    schedule: (fn, delayMs) => core.schedule(fn, delayMs),

    startRefreshInterval(doUpdate) {
      if (cfg.refreshInterval !== undefined && cfg.refreshInterval > 0) {
        refreshTimer = setInterval(() => {
          if (!core.isDisposed) doUpdate();
        }, cfg.refreshInterval);
      }
    },

    subscribe: (listener) => core.subscribe(listener),

    [Symbol.dispose]: dispose,
  };
}
