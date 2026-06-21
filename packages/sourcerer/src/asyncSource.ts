import type { SourceCore } from './core';

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

export type FetchExecutor<TQuery> = (q: TQuery, signal: AbortSignal, isLatest: () => boolean) => Promise<void>;

export type AsyncSourceInfra<TQuery> = {
  [Symbol.dispose](): void;
  /** `true` when `autoFetch !== false`. */
  readonly autoFetch: boolean;
  /** The underlying SourceCore — use directly for subscribe, schedule, cancelTimer, flush, isScheduled. */
  readonly core: SourceCore;
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
  /** Number of currently in-flight requests. */
  pendingCount(): number;
  /** Resolves when idle (no in-flight requests, no pending debounce). */
  ready(timeout?: number): Promise<void>;
  /** Number of retry attempts after the first failure. */
  readonly retryAttempts: number;
  /** Returns the delay in ms before the nth retry. */
  readonly retryDelay: (attempt: number) => number;
  /**
   * Wire the refresh interval. Must be called once after construction, passing
   * the source-level `doUpdate` callback. Does nothing when `refreshInterval`
   * is unset or ≤ 0.
   */
  startRefreshInterval(doUpdate: () => void): void;
};

/**
 * Creates the shared infrastructure used by `createRemoteSource`, `createCursorSource`,
 * and `createInfiniteSource`. Eliminates duplication of lifecycle, config-defaults,
 * fetch-manager setup, dispose, ready, flush, and refresh-interval logic.
 *
 * Each source factory composes this and adds its own query state, meta shape, and
 * source-specific methods. Pass `onBeforeNotify` to run `refreshMeta()` before
 * subscribers observe each notification — this eliminates the need for a parallel
 * listeners Set in each source factory.
 */
export function createAsyncSource<TQuery>(
  cfg: AsyncSourceConfig<TQuery>,
  keyOf: (q: TQuery) => string = defaultKeyOf as (q: TQuery) => string,
  onBeforeNotify?: () => void,
): AsyncSourceInfra<TQuery> {
  const core = createSourceCore({ onBeforeNotify });
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
    core,
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

    pendingCount: () => fm.pendingCount,

    ready(timeout) {
      return core.ready(() => fm.pendingCount === 0 && !core.isScheduled, timeout);
    },
    retryAttempts,

    retryDelay,

    startRefreshInterval(doUpdate) {
      if (cfg.refreshInterval !== undefined && cfg.refreshInterval > 0) {
        refreshTimer = setInterval(() => {
          if (!core.isDisposed) doUpdate();
        }, cfg.refreshInterval);
      }
    },

    [Symbol.dispose]: dispose,
  };
}
