import type { InfiniteConfig, InfiniteMeta, InfiniteSource, InfiniteSourceQuery, SearchOptions } from './types';

import { createAsyncSource } from './asyncSource';
import { SourceError } from './types';
import { defaultKeyOf, extractError, retry } from './utils';

type PendingSearch = { promise: Promise<void>; resolve: () => void };

/** Creates an infinite-scroll source that appends pages on `loadMore()`. */
export function createInfiniteSource<T>(cfg: InfiniteConfig<T>): InfiniteSource<T> {
  const keyOf = cfg.queryKey ?? defaultKeyOf;
  const base = createAsyncSource<InfiniteSourceQuery>(cfg, keyOf);
  const { autoFetch, debounceMs, retryAttempts, retryDelay } = base;

  // ── Mutable state ───────────────────────────────────────────────────────────
  let limit = Math.max(1, Math.trunc(cfg.limit ?? 20));
  let search = '';
  let currentPage = 1;
  let loadedPages = 0;
  let items: readonly T[] = [];
  let total = 0;
  let error: SourceError | null = null;
  let isLoadingMore = false;
  let pendingSearch: PendingSearch | null = null;

  // ── Cached accessors ─────────────────────────────────────────────────────────
  let cachedCurrent: readonly T[] = [];
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

  const listeners = new Set<() => void>();

  const refreshMeta = () => {
    cachedCurrent = items;
    cachedMeta = {
      error,
      hasMore: items.length < total,
      isLoading: base.pendingCount() > 0 && !isLoadingMore,
      isLoadingMore,
      isSearchPending: base.isScheduled(),
      loadedPages,
      pageSize: limit,
      totalItems: total,
    };
  };

  refreshMeta();

  const notifyListeners = () => {
    if (base.disposed) return;

    refreshMeta();
    base.notify();

    for (const l of listeners) l();
  };

  const resolvePendingSearch = () => {
    if (pendingSearch) {
      pendingSearch.resolve();
      pendingSearch = null;
    }
  };

  // ── Core fetch ──────────────────────────────────────────────────────────────
  const fetchPage = (targetPage: number, append: boolean): Promise<void> => {
    const q: InfiniteSourceQuery = {
      ...(search && { search }),
      limit,
      page: targetPage,
    };

    error = null;

    return base.fetch(
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
            error = new SourceError(extractError(reason), {
              cause: reason,
              context: { kind: 'infinite', limit: q.limit, page: q.page, ...(q.search && { search: q.search }) },
            });
            cfg.onFetch?.({ durationMs: Date.now() - startTime, error, query: q, status: 'error' });
          }
        } finally {
          isLoadingMore = false;
        }
      },
      () => {
        notifyListeners();

        if (base.pendingCount() === 0) resolvePendingSearch();
      },
    );
  };

  const doFetch = () => fetchPage(1, false);

  // ── Auto-fetch + refresh interval ───────────────────────────────────────────
  if (autoFetch) void doFetch();

  base.startRefreshInterval(() => void doFetch());

  // ── Public API ──────────────────────────────────────────────────────────────
  return {
    get current() {
      return cachedCurrent;
    },

    get disposalSignal() {
      return base.disposalSignal;
    },

    dispose: () => {
      resolvePendingSearch();
      base.dispose();
    },

    get disposed() {
      return base.disposed;
    },

    loadMore() {
      if (!cachedMeta.hasMore || base.pendingCount() > 0 || isLoadingMore) return Promise.resolve();

      isLoadingMore = true;
      refreshMeta();

      return fetchPage(currentPage + 1, true);
    },

    get meta() {
      return cachedMeta;
    },

    patch(changes) {
      let changed = false;

      if (changes.limit !== undefined) {
        const next = Math.max(1, Math.trunc(changes.limit));

        if (next !== limit) {
          limit = next;
          changed = true;
        }
      }

      if ('search' in changes && changes.search !== search) {
        search = changes.search ?? '';
        changed = true;
      }

      if (!changed) return Promise.resolve();

      items = [];
      total = 0;
      currentPage = 1;
      loadedPages = 0;

      return doFetch();
    },

    ready(timeout) {
      return base.ready(timeout);
    },

    reset() {
      base.cancelTimer();
      resolvePendingSearch();
      currentPage = 1;
      loadedPages = 0;
      items = [];
      total = 0;
      search = '';

      return doFetch();
    },

    search(q, opts?: SearchOptions): Promise<void> {
      if (opts?.immediate) {
        if (q === search) return Promise.resolve();

        base.cancelTimer();
        resolvePendingSearch();
        search = q;
        items = [];
        total = 0;
        loadedPages = 0;
        currentPage = 1;

        return doFetch();
      }

      if (q === search) return Promise.resolve();

      resolvePendingSearch();

      search = q;
      items = [];
      total = 0;
      loadedPages = 0;
      currentPage = 1;

      let resolveSearch!: () => void;
      const promise = new Promise<void>((res) => {
        resolveSearch = res;
      });

      pendingSearch = { promise, resolve: resolveSearch };

      base.schedule(() => void doFetch(), debounceMs);
      notifyListeners();

      return promise;
    },

    setLimit(n) {
      const next = Math.max(1, Math.trunc(n));

      if (next === limit) return Promise.resolve();

      limit = next;
      items = [];
      total = 0;
      currentPage = 1;
      loadedPages = 0;

      return doFetch();
    },

    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    [Symbol.dispose]: () => {
      resolvePendingSearch();
      base.dispose();
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
