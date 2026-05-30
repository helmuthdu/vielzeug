import type { CursorConfig, CursorMeta, CursorSource, CursorSourceQuery } from './types';

import { createSourceCore } from './core';
import { defaultKeyOf, defaultRetryDelay, extractError, retry } from './utils';

const DEFAULTS = { debounceMs: 300, limit: 10 } as const;

/**
 * Creates a cursor-based data source backed by a remote fetch function.
 * Uses cursor tokens rather than page numbers for forward/backward navigation.
 */
export function createCursorSource<T, TCursor = string>(cfg: CursorConfig<T, TCursor>): CursorSource<T, TCursor> {
  const core = createSourceCore();
  const limitDefault = Math.max(1, cfg.limit ?? DEFAULTS.limit);
  const debounceMs = cfg.debounceMs ?? DEFAULTS.debounceMs;
  const keyOf = cfg.queryKey ?? defaultKeyOf;
  const autoFetch = cfg.autoFetch ?? true;
  const retryAttempts = cfg.retry?.attempts ?? 0;
  const retryDelay = cfg.retry?.delay ?? defaultRetryDelay;
  const refreshIntervalMs = cfg.refreshInterval ?? 0;

  let limit = limitDefault;
  let search = '';
  let after: TCursor | undefined;
  let before: TCursor | undefined;
  let nextCursor: TCursor | undefined;
  let prevCursor: TCursor | undefined;

  let items: readonly T[] = [];
  let total = 0;
  let error: string | null = null;
  let cachedMeta!: CursorMeta;
  let pendingCount = 0;
  let latestKey = '';

  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  const inflight = new Map<string, { controller: AbortController; promise: Promise<void> }>();

  const buildQuery = (): CursorSourceQuery<TCursor> => ({
    after,
    before,
    limit,
    search: search || undefined,
  });

  const refreshMeta = () => {
    cachedMeta = {
      errorMessage: error,
      hasNextPage: nextCursor !== undefined,
      hasPrevPage: prevCursor !== undefined,
      isLoading: pendingCount > 0,
      isSearchPending: core.isScheduled,
      pageSize: limit,
      totalItems: total,
    };
  };

  const notify = () => {
    refreshMeta();
    core.notify();
  };

  const fetchQuery = async (q: CursorSourceQuery<TCursor>): Promise<void> => {
    const key = keyOf(q);
    const startTime = Date.now();

    latestKey = key;

    for (const [k, entry] of inflight) {
      if (k !== key) entry.controller.abort();
    }

    if (inflight.has(key)) {
      pendingCount++;
      notify();

      try {
        await inflight.get(key)!.promise;
      } finally {
        pendingCount--;
        notify();
      }

      return;
    }

    const controller = new AbortController();

    pendingCount++;
    error = null;
    notify();

    const promise = retry((signal) => cfg.fetch(q, signal), {
      delay: retryDelay,
      signal: controller.signal,
      times: retryAttempts + 1,
    })
      .then((result) => {
        if (key === latestKey) {
          items = result.items;
          total = result.total ?? 0;
          nextCursor = result.nextCursor;
          prevCursor = result.prevCursor;
          error = null;
          cfg.onFetch?.({ durationMs: Date.now() - startTime, query: q, status: 'success' });
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;

        if (key === latestKey) {
          error = extractError(reason);
          items = [];
          total = 0;
          nextCursor = undefined;
          prevCursor = undefined;
          cfg.onFetch?.({ durationMs: Date.now() - startTime, error: error, query: q, status: 'error' });
        }
      })
      .finally(() => {
        inflight.delete(key);
        pendingCount--;
        notify();
      });

    inflight.set(key, { controller, promise });
    await promise;
  };

  const doUpdate = () => fetchQuery(buildQuery());

  refreshMeta();

  if (autoFetch) {
    void doUpdate();
  }

  if (refreshIntervalMs > 0) {
    refreshTimer = setInterval(() => {
      void doUpdate();
    }, refreshIntervalMs);
  }

  return {
    get current() {
      return items;
    },

    dispose() {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = undefined;
      }

      for (const entry of inflight.values()) {
        entry.controller.abort();
      }

      inflight.clear();
      core.dispose();
    },

    flush(): Promise<void> {
      return core.flush(() => doUpdate());
    },

    get meta() {
      return cachedMeta;
    },

    next(): Promise<void> {
      if (!nextCursor) return Promise.resolve();

      after = nextCursor;
      before = undefined;

      return doUpdate();
    },

    prev(): Promise<void> {
      if (!prevCursor) return Promise.resolve();

      before = prevCursor;
      after = undefined;

      return doUpdate();
    },

    ready(): Promise<void> {
      return core.ready(() => pendingCount === 0 && !core.isScheduled);
    },

    refresh(): Promise<void> {
      return doUpdate();
    },

    reset(): Promise<void> {
      limit = limitDefault;
      search = '';
      after = undefined;
      before = undefined;
      nextCursor = undefined;
      prevCursor = undefined;

      return doUpdate();
    },

    search(q: string) {
      search = q;
      after = undefined;
      before = undefined;
      core.schedule(() => {
        void doUpdate();
      }, debounceMs);
      notify();
    },

    searchNow(q: string): Promise<void> {
      core.cancelTimer();
      search = q;
      after = undefined;
      before = undefined;

      return doUpdate();
    },

    setLimit(n: number): Promise<void> {
      limit = Math.max(1, Math.trunc(n));
      after = undefined;
      before = undefined;

      return doUpdate();
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    toQuery(): CursorSourceQuery<TCursor> {
      return buildQuery();
    },
  };
}
