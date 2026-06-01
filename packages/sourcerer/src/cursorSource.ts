import type { CursorConfig, CursorMeta, CursorSource, CursorSourceQuery } from './types';

import { createSourceCore } from './core';
import { createFetchManager } from './fetchManager';
import { SourceError } from './types';
import { defaultKeyOf, defaultRetryDelay, extractError, retry } from './utils';

/** Creates a cursor-based (keyset-pagination) source that fetches data from a network endpoint. */
export function createCursorSource<T, TCursor = string>(cfg: CursorConfig<T, TCursor>): CursorSource<T, TCursor> {
  const core = createSourceCore();

  // ── Config defaults ─────────────────────────────────────────────────────────
  const debounceMs = cfg.debounceMs ?? 300;
  const retryAttempts = cfg.retry?.attempts ?? 0;
  const retryDelay = cfg.retry?.delay ?? defaultRetryDelay;
  const autoFetch = cfg.autoFetch !== false;
  const keyOf = cfg.queryKey ?? defaultKeyOf;

  // ── Mutable state ───────────────────────────────────────────────────────────
  let limit = Math.max(1, Math.trunc(cfg.limit ?? 20));
  let search = '';
  let afterCursor: TCursor | undefined;
  let beforeCursor: TCursor | undefined;
  let nextCursor: TCursor | undefined;
  let prevCursor: TCursor | undefined;
  let items: readonly T[] = [];
  let total = 0;
  let error: SourceError | null = null;

  // ── In-flight deduplication ─────────────────────────────────────────────────
  const fm = createFetchManager<CursorSourceQuery<TCursor>>(keyOf);

  // ── Cached accessors ────────────────────────────────────────────────────────
  let cachedCurrent: readonly T[] = [];
  let cachedMeta: CursorMeta = {
    error: null,
    hasNextPage: false,
    hasPrevPage: false,
    isLoading: false,
    isSearchPending: false,
    pageSize: limit,
    totalItems: 0,
  };

  const refreshMeta = () => {
    cachedCurrent = items;
    cachedMeta = {
      error,
      hasNextPage: nextCursor !== undefined,
      hasPrevPage: prevCursor !== undefined,
      isLoading: fm.pendingCount > 0,
      isSearchPending: core.isScheduled,
      pageSize: limit,
      totalItems: total,
    };
  };

  refreshMeta();

  const commit = () => {
    refreshMeta();
    core.notify();
  };

  // ── Core fetch ──────────────────────────────────────────────────────────────
  const toRemoteQuery = (): CursorSourceQuery<TCursor> => ({
    ...(afterCursor !== undefined && { after: afterCursor }),
    ...(beforeCursor !== undefined && { before: beforeCursor }),
    ...(search && { search }),
    limit,
  });

  const fetchQuery = (q: CursorSourceQuery<TCursor>): Promise<void> => {
    error = null;

    return fm.run(
      q,
      async (q, signal, isLatest) => {
        const startTime = Date.now();

        try {
          const result = await retry((sig) => cfg.fetch(q, sig!), {
            delay: retryDelay,
            signal,
            times: retryAttempts + 1,
          });

          if (isLatest()) {
            items = result.items;
            total = result.total ?? result.items.length;
            nextCursor = result.nextCursor;
            prevCursor = result.prevCursor;
            error = null;
            cfg.onFetch?.({ durationMs: Date.now() - startTime, query: q, status: 'success' });
          }
        } catch (reason: unknown) {
          if (signal.aborted) return;

          if (isLatest()) {
            items = [];
            total = 0;
            nextCursor = undefined;
            prevCursor = undefined;
            error = new SourceError(extractError(reason), { cause: reason, query: q });
            cfg.onFetch?.({ durationMs: Date.now() - startTime, error, query: q, status: 'error' });
          }
        }
      },
      commit,
    );
  };

  const doUpdate = () => fetchQuery(toRemoteQuery());

  // ── Auto-fetch + refresh interval ───────────────────────────────────────────
  if (autoFetch) void doUpdate();

  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  if (cfg.refreshInterval !== undefined && cfg.refreshInterval > 0) {
    refreshTimer = setInterval(() => {
      if (!core.isDisposed) void doUpdate();
    }, cfg.refreshInterval);
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  return {
    get current() {
      return cachedCurrent;
    },

    dispose() {
      if (refreshTimer !== undefined) {
        clearInterval(refreshTimer);
        refreshTimer = undefined;
      }

      fm.dispose();
      core.dispose();
    },

    flush() {
      return core.flush(() => doUpdate());
    },

    get meta() {
      return cachedMeta;
    },

    next() {
      if (!nextCursor) return Promise.resolve();

      afterCursor = nextCursor;
      beforeCursor = undefined;

      return doUpdate();
    },

    prev() {
      if (!prevCursor) return Promise.resolve();

      beforeCursor = prevCursor;
      afterCursor = undefined;

      return doUpdate();
    },

    ready(timeout) {
      return core.ready(() => fm.pendingCount === 0 && !core.isScheduled, timeout);
    },

    refresh() {
      return doUpdate();
    },

    reset() {
      core.cancelTimer();
      search = '';
      afterCursor = undefined;
      beforeCursor = undefined;

      return doUpdate();
    },

    restoreQuery(patch) {
      let changed = false;

      if (patch.limit !== undefined) {
        const n = Math.max(1, Math.trunc(patch.limit));

        if (n !== limit) {
          limit = n;
          afterCursor = undefined;
          beforeCursor = undefined;
          changed = true;
        }
      }

      if ('search' in patch) {
        const s = patch.search ?? '';

        if (s !== search) {
          search = s;
          afterCursor = undefined;
          beforeCursor = undefined;
          changed = true;
        }
      }

      if (!changed) return Promise.resolve();

      return doUpdate();
    },

    search(q) {
      if (q === search) return;

      search = q;
      afterCursor = undefined;
      beforeCursor = undefined;
      core.schedule(() => {
        void doUpdate();
      }, debounceMs);
      commit();
    },

    searchNow(q) {
      if (q === search) return Promise.resolve();

      core.cancelTimer();
      search = q;
      afterCursor = undefined;
      beforeCursor = undefined;

      return doUpdate();
    },

    setLimit(n) {
      const next = Math.max(1, Math.trunc(n));

      if (next === limit) return Promise.resolve();

      limit = next;
      afterCursor = undefined;
      beforeCursor = undefined;

      return doUpdate();
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    toQuery() {
      return {
        ...(afterCursor !== undefined && { after: afterCursor }),
        ...(beforeCursor !== undefined && { before: beforeCursor }),
        ...(search && { search }),
        limit,
      };
    },
  };
}
