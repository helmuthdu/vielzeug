import type { RemoteConfig, RemoteFetchQuery, RemoteSource, RemoteSourceQuery } from './types';

import { createSourceCore } from './core';
import { createFetchManager } from './fetchManager';
import { clampPage, createMeta, pageCount } from './pagination';
import { SourceError } from './types';
import { defaultKeyOf, defaultRetryDelay, extractError, retry } from './utils';

/** Creates a remote page-based source that fetches data from a network endpoint. */
export function createRemoteSource<T, TFilter = unknown, TSort = unknown>(
  cfg: RemoteConfig<T, TFilter, TSort>,
): RemoteSource<T, TFilter, TSort> {
  const core = createSourceCore();

  // ── Config defaults ─────────────────────────────────────────────────────────
  const debounceMs = cfg.debounceMs ?? 300;
  const retryAttempts = cfg.retry?.attempts ?? 0;
  const retryDelay = cfg.retry?.delay ?? defaultRetryDelay;
  const autoFetch = cfg.autoFetch !== false;
  const staleTimeMs = cfg.staleTime ?? 0;
  const keyOf = cfg.queryKey ?? defaultKeyOf;

  // ── Mutable state ───────────────────────────────────────────────────────────
  let limit = Math.max(1, Math.trunc(cfg.limit ?? 20));
  let page = 1;
  let search = '';
  let filter: TFilter | undefined = cfg.filter;
  let sort: TSort | undefined = cfg.sort;
  let items: readonly T[] = [];
  let total = 0;
  let error: SourceError | null = null;
  let lastFetchTime = 0;
  let lastFetchKey = '';
  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  // Optimistic update state.
  let optimistic: { active: boolean; prevItems: readonly T[]; prevTotal: number } | null = null;

  // ── In-flight deduplication ─────────────────────────────────────────────────
  const fm = createFetchManager<RemoteSourceQuery<TFilter, TSort>>(keyOf);

  // ── Snapshot pre-population ─────────────────────────────────────────────────
  if (cfg.snapshot) {
    items = cfg.snapshot.items;
    total = cfg.snapshot.total;

    if (cfg.snapshot.page !== undefined) page = cfg.snapshot.page;

    if (cfg.snapshot.search) search = cfg.snapshot.search;

    lastFetchTime = Date.now();
  }

  // ── Cached accessors ────────────────────────────────────────────────────────
  let cachedCurrent: readonly T[] = [];
  let cachedMeta = createMeta({
    error: null,
    isLoading: false,
    isSearchPending: false,
    pageNumber: 1,
    pageSize: limit,
    totalItems: 0,
  });

  const refreshMeta = () => {
    const pages = pageCount(total, limit);
    const safePage = clampPage(page, pages);

    // items is already the current page from the server — no local slicing needed.
    cachedCurrent = items;
    cachedMeta = createMeta({
      error,
      isLoading: fm.pendingCount > 0,
      isSearchPending: core.isScheduled,
      pageNumber: safePage,
      pageSize: limit,
      totalItems: total,
    });
  };

  // Initialise cache before first fetch.
  refreshMeta();

  const commit = () => {
    refreshMeta();
    core.notify();
  };

  // ── Assign result ───────────────────────────────────────────────────────────
  const assign = (result: Readonly<{ items: readonly T[]; total: number }>) => {
    if (optimistic?.active) {
      optimistic.active = false;
      optimistic = null;
    }

    items = result.items;
    total = result.total;
    page = clampPage(page, pageCount(total, limit));
  };

  // ── Core fetch ──────────────────────────────────────────────────────────────
  const toRemoteQuery = (): RemoteFetchQuery<TFilter, TSort> => ({
    ...(filter !== undefined && { filter }),
    ...(sort !== undefined && { sort }),
    ...(search && { search }),
    limit,
    page,
  });

  const fetchQuery = (q: RemoteFetchQuery<TFilter, TSort>): Promise<void> => {
    const key = keyOf(q);

    if (staleTimeMs > 0 && key === lastFetchKey && total > 0 && Date.now() - lastFetchTime < staleTimeMs) {
      return Promise.resolve();
    }

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
            assign(result);
            error = null;
            lastFetchKey = key;
            lastFetchTime = Date.now();
            cfg.onFetch?.({ durationMs: Date.now() - startTime, query: q, status: 'success' });
          }
        } catch (reason: unknown) {
          if (signal.aborted) return;

          if (isLatest()) {
            if (optimistic?.active) {
              optimistic.active = false;
              items = optimistic.prevItems;
              total = optimistic.prevTotal;
              optimistic = null;
            } else {
              items = [];
              total = 0;
            }

            error = new SourceError(extractError(reason), { cause: reason, query: q });
            cfg.onFetch?.({ durationMs: Date.now() - startTime, error, query: q, status: 'error' });
          }
        }
      },
      commit,
    );
  };

  const doUpdate = () => fetchQuery(toRemoteQuery());

  // ── Auto-fetch ──────────────────────────────────────────────────────────────
  if (autoFetch) {
    void doUpdate();
  }

  // ── Refresh interval ────────────────────────────────────────────────────────
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

    goTo(target) {
      const clamped = total > 0 ? clampPage(target, pageCount(total, limit)) : Math.max(1, Math.trunc(target));

      if (clamped === page) return Promise.resolve();

      page = clamped;

      return doUpdate();
    },

    goToLast() {
      const last = pageCount(total, limit);

      if (page === last) return Promise.resolve();

      page = last;

      return doUpdate();
    },

    get meta() {
      return cachedMeta;
    },

    next() {
      const pages = pageCount(total, limit);

      if (page >= pages) return Promise.resolve();

      page++;

      return doUpdate();
    },

    optimisticUpdate(mutator, options) {
      if (optimistic?.active) {
        throw new Error(
          'An optimistic update is already active. Rollback the previous update before starting another.',
        );
      }

      const prevItems = items;
      const prevTotal = total;

      optimistic = { active: true, prevItems, prevTotal };

      try {
        items = mutator(items);
      } catch (e: unknown) {
        optimistic = null;
        throw e;
      }

      total = options?.total ?? total;
      commit();

      return () => {
        if (optimistic?.active) {
          optimistic.active = false;
          items = prevItems;
          total = prevTotal;
          optimistic = null;
          commit();
        }
      };
    },

    prev() {
      if (page <= 1) return Promise.resolve();

      page--;

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
      page = 1;
      filter = cfg.filter;
      sort = cfg.sort;

      return doUpdate();
    },

    restoreQuery(patch) {
      core.cancelTimer();

      let changed = false;

      if (patch.limit !== undefined) {
        const n = Math.max(1, Math.trunc(patch.limit));

        if (n !== limit) {
          limit = n;
          changed = true;
        }
      }

      if ('search' in patch) {
        const s = patch.search ?? '';

        if (s !== search) {
          search = s;
          changed = true;
        }
      }

      if ('filter' in patch && patch.filter !== filter) {
        filter = patch.filter;
        page = 1;
        changed = true;
      }

      if ('sort' in patch && patch.sort !== sort) {
        sort = patch.sort;
        page = 1;
        changed = true;
      }

      if (patch.page !== undefined) {
        const clamped =
          total > 0 ? clampPage(patch.page, pageCount(total, limit)) : Math.max(1, Math.trunc(patch.page));

        if (clamped !== page) {
          page = clamped;
          changed = true;
        }
      }

      if (!changed) return Promise.resolve();

      return doUpdate();
    },

    search(q) {
      if (q === search) return;

      search = q;
      page = 1;
      core.schedule(() => {
        void doUpdate();
      }, debounceMs);
      commit();
    },

    searchNow(q) {
      if (q === search) return Promise.resolve();

      core.cancelTimer();
      search = q;
      page = 1;

      return doUpdate();
    },

    setFilter(f) {
      if (f === filter) return Promise.resolve();

      filter = f;
      page = 1;

      return doUpdate();
    },

    setLimit(n) {
      const next = Math.max(1, Math.trunc(n));

      if (next === limit) return Promise.resolve();

      limit = next;
      page = 1;

      return doUpdate();
    },

    setSort(s) {
      if (s === sort) return Promise.resolve();

      sort = s;
      page = 1;

      return doUpdate();
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    [Symbol.dispose]() {
      this.dispose();
    },

    toQuery() {
      return {
        ...(filter !== undefined && { filter }),
        ...(sort !== undefined && { sort }),
        ...(search && { search }),
        limit,
        page,
      };
    },
  };
}
