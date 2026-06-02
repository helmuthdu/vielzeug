import type { InfiniteConfig, InfiniteMeta, InfiniteSource, InfiniteSourceQuery } from './types';

import { createSourceCore } from './core';
import { createFetchManager } from './fetchManager';
import { SourceError } from './types';
import { defaultKeyOf, defaultRetryDelay, extractError, retry } from './utils';

/** Creates an infinite-scroll source that appends pages on `loadMore()`. */
export function createInfiniteSource<T>(cfg: InfiniteConfig<T>): InfiniteSource<T> {
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
  let currentPage = 1;
  let loadedPages = 0;
  let items: readonly T[] = [];
  let total = 0;
  let error: SourceError | null = null;
  let isLoadingMore = false;
  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  // ── In-flight deduplication ─────────────────────────────────────────────────
  const fm = createFetchManager<InfiniteSourceQuery>(keyOf);

  // ── Cached meta ─────────────────────────────────────────────────────────────
  let cachedMeta: InfiniteMeta = {
    error: null,
    hasMore: false,
    isLoading: false,
    isLoadingMore: false,
    isSearchPending: false,
    loadedPages: 0,
    pageSize: limit,
    totalItems: 0,
  };

  const refreshMeta = () => {
    cachedMeta = {
      error,
      hasMore: items.length < total,
      isLoading: fm.pendingCount > 0 && !isLoadingMore,
      isLoadingMore,
      isSearchPending: core.isScheduled,
      loadedPages,
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
  const fetchPage = (targetPage: number, append: boolean): Promise<void> => {
    const q: InfiniteSourceQuery = {
      ...(search && { search }),
      limit,
      page: targetPage,
    };

    error = null;
    commit();

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
            if (append) {
              items = [...items, ...result.items];
            } else {
              items = result.items;
            }

            total = result.total;
            currentPage = targetPage;
            loadedPages = append ? loadedPages + 1 : 1;
            error = null;
            cfg.onFetch?.({ durationMs: Date.now() - startTime, query: q, status: 'success' });
          }
        } catch (reason: unknown) {
          if (signal.aborted) return;

          if (isLatest()) {
            if (!append) items = [];

            total = append ? total : 0;
            error = new SourceError(extractError(reason), { cause: reason, query: q });
            cfg.onFetch?.({ durationMs: Date.now() - startTime, error, query: q, status: 'error' });
          }
        } finally {
          isLoadingMore = false;
        }
      },
      commit,
    );
  };

  const doFetch = () => fetchPage(1, false);

  // ── Auto-fetch + refresh interval ───────────────────────────────────────────
  if (autoFetch) void doFetch();

  if (cfg.refreshInterval !== undefined && cfg.refreshInterval > 0) {
    refreshTimer = setInterval(() => {
      if (!core.isDisposed) void doFetch();
    }, cfg.refreshInterval);
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  return {
    get current() {
      return items;
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
      return core.flush(() => doFetch());
    },

    loadMore() {
      if (!cachedMeta.hasMore || fm.pendingCount > 0 || isLoadingMore) return Promise.resolve();

      isLoadingMore = true;
      refreshMeta();

      return fetchPage(currentPage + 1, true);
    },

    get meta() {
      return cachedMeta;
    },

    ready(timeout) {
      return core.ready(() => fm.pendingCount === 0 && !core.isScheduled, timeout);
    },

    reset() {
      core.cancelTimer();
      currentPage = 1;
      loadedPages = 0;
      search = '';

      return doFetch();
    },

    search(q) {
      if (q === search) return;

      search = q;
      core.schedule(() => {
        void doFetch();
      }, debounceMs);
      refreshMeta();
      core.notify();
    },

    searchNow(q) {
      if (q === search) return Promise.resolve();

      core.cancelTimer();
      search = q;

      return doFetch();
    },

    setLimit(n) {
      const next = Math.max(1, Math.trunc(n));

      if (next === limit) return Promise.resolve();

      limit = next;

      return doFetch();
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    toQuery() {
      return {
        ...(search && { search }),
        limit,
        page: currentPage,
      };
    },
  };
}
