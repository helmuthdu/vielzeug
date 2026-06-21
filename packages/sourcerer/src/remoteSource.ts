import type { RemoteConfig, RemoteSource, RemoteSourceQuery, SearchOptions } from './types';

import { createAsyncSource } from './asyncSource';
import { clampPage, createMeta, pageCount } from './pagination';
import { SourceError } from './types';
import { defaultKeyOf, extractError, retry } from './utils';

type PendingSearch = { promise: Promise<void>; resolve: () => void };

/** Creates a remote page-based source that fetches data from a network endpoint. */
export function createRemoteSource<T, TFilter = unknown, TSort = unknown>(
  cfg: RemoteConfig<T, TFilter, TSort>,
): RemoteSource<T, TFilter, TSort> {
  const keyOf = cfg.queryKey ?? defaultKeyOf;

  // ── Config defaults ─────────────────────────────────────────────────────────
  const staleTimeMs = cfg.staleTime ?? 0;

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
  let pendingSearch: PendingSearch | null = null;

  // Optimistic update state.
  let optimistic: { active: boolean; prevItems: readonly T[]; prevTotal: number } | null = null;

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
      isLoading: base.pendingCount() > 0,
      isSearchPending: base.core.isScheduled,
      pageNumber: safePage,
      pageSize: limit,
      totalItems: total,
    });
  };

  // onBeforeNotify ensures refreshMeta() runs before any subscriber observes the new state,
  // eliminating the need for a parallel listeners Set.
  const base = createAsyncSource<RemoteSourceQuery<TFilter, TSort>>(cfg, keyOf, refreshMeta);
  const { autoFetch, debounceMs, retryAttempts, retryDelay } = base;

  // Initialise cache before first fetch.
  refreshMeta();

  const notifyListeners = () => {
    if (base.disposed) return;

    base.core.notify();
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

  const resolvePendingSearch = () => {
    if (pendingSearch) {
      pendingSearch.resolve();
      pendingSearch = null;
    }
  };

  // ── Core fetch ──────────────────────────────────────────────────────────────
  const toRemoteQuery = (): RemoteSourceQuery<TFilter, TSort> => ({
    ...(filter !== undefined && { filter }),
    ...(sort !== undefined && { sort }),
    ...(search && { search }),
    limit,
    page,
  });

  const fetchQuery = (q: RemoteSourceQuery<TFilter, TSort>): Promise<void> => {
    const key = keyOf(q);

    if (staleTimeMs > 0 && key === lastFetchKey && total > 0 && Date.now() - lastFetchTime < staleTimeMs) {
      return Promise.resolve();
    }

    error = null;

    return base.fetch(
      q,
      async (q: RemoteSourceQuery<TFilter, TSort>, signal, isLatest) => {
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

            error = new SourceError(extractError(reason), {
              cause: reason,
              context: { kind: 'remote', limit: q.limit, page: q.page, ...(q.search && { search: q.search }) },
            });
            cfg.onFetch?.({ durationMs: Date.now() - startTime, error, query: q, status: 'error' });
          }
        }
      },
      () => {
        notifyListeners();

        if (base.pendingCount() === 0) resolvePendingSearch();
      },
    );
  };

  const doUpdate = () => fetchQuery(toRemoteQuery());

  // ── Auto-fetch + refresh interval ───────────────────────────────────────────
  if (autoFetch) void doUpdate();

  base.startRefreshInterval(() => void doUpdate());

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
      notifyListeners();

      return () => {
        if (optimistic?.active) {
          optimistic.active = false;
          items = prevItems;
          total = prevTotal;
          optimistic = null;
          notifyListeners();
        }
      };
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

      if ('filter' in changes) {
        filter = changes.filter as TFilter | undefined;
        changed = true;
      }

      if ('sort' in changes) {
        sort = changes.sort as TSort | undefined;
        changed = true;
      }

      if ('search' in changes && changes.search !== search) {
        search = changes.search ?? '';
        changed = true;
      }

      if (changes.page !== undefined) {
        const next =
          total > 0 ? clampPage(changes.page, pageCount(total, limit)) : Math.max(1, Math.trunc(changes.page));

        if (next !== page) {
          page = next;
          changed = true;
        }
      }

      if (!changed) return Promise.resolve();

      // Reset to page 1 when non-page query fields changed without explicit page
      if (
        (changes.limit !== undefined || 'filter' in changes || 'sort' in changes || 'search' in changes) &&
        changes.page === undefined
      ) {
        page = 1;
      }

      return doUpdate();
    },

    prev() {
      if (page <= 1) return Promise.resolve();

      page--;

      return doUpdate();
    },

    get query() {
      return {
        ...(filter !== undefined && { filter }),
        ...(sort !== undefined && { sort }),
        ...(search && { search }),
        limit,
        page,
      };
    },

    ready(timeout) {
      return base.ready(timeout);
    },

    refresh() {
      return doUpdate();
    },

    reset() {
      base.core.cancelTimer();
      resolvePendingSearch();
      search = '';
      page = 1;
      filter = cfg.filter;
      sort = cfg.sort;

      return doUpdate();
    },

    search(q, opts?: SearchOptions): Promise<void> {
      if (opts?.immediate) {
        if (q === search) return Promise.resolve();

        base.core.cancelTimer();
        resolvePendingSearch();
        search = q;
        page = 1;

        return doUpdate();
      }

      if (q === search) return Promise.resolve();

      resolvePendingSearch();

      search = q;
      page = 1;

      let resolveSearch!: () => void;
      const promise = new Promise<void>((res) => {
        resolveSearch = res;
      });

      pendingSearch = { promise, resolve: resolveSearch };

      base.core.schedule(() => void doUpdate(), debounceMs);
      notifyListeners();

      return promise;
    },

    subscribe: (listener) => base.core.subscribe(listener),

    [Symbol.dispose]: () => {
      resolvePendingSearch();
      base.dispose();
    },
  };
}
