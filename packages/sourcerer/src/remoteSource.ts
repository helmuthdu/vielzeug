import type { RemoteConfig, RemoteSource, RemoteSourceQuery, SourceMeta } from './types';

import { createSourceCore } from './core';
import { createMeta, pageCount } from './pagination';
import { defaultKeyOf, defaultRetryDelay, extractError, retry } from './utils';

type RemoteQuery<TFilter, TSort> = Readonly<{
  filter?: TFilter;
  limit: number;
  page: number;
  search?: string;
  sort?: TSort;
}>;

type RemoteResult<T> = Readonly<{ items: readonly T[]; total: number }>;

type OptimisticEntry<T> = {
  active: boolean;
  items: readonly T[];
  prevItems: readonly T[];
  prevTotal: number;
  total: number;
};

export function createRemoteSource<T, TFilter = unknown, TSort = unknown>(
  cfg: RemoteConfig<T, TFilter, TSort>,
): RemoteSource<T, TFilter, TSort> {
  const core = createSourceCore();
  const limitDefault = Math.max(1, cfg.limit ?? 10);
  const debounceMs = cfg.debounceMs ?? 300;
  const keyOf = cfg.queryKey ?? defaultKeyOf;
  const autoFetch = cfg.autoFetch ?? true;
  const retryAttempts = cfg.retry?.attempts ?? 0;
  const retryDelay = cfg.retry?.delay ?? defaultRetryDelay;
  const refreshIntervalMs = cfg.refreshInterval ?? 0;

  // Initialise from snapshot when provided (SSR hydration).
  let page = cfg.snapshot?.page ?? 1;
  let limit = limitDefault;
  let search = cfg.snapshot?.search ?? '';
  let filter = cfg.filter as TFilter | undefined;
  let sort = cfg.sort as TSort | undefined;

  let items: readonly T[] = cfg.snapshot?.items ?? [];
  let total = cfg.snapshot?.total ?? 0;
  let error: string | null = null;
  let cachedMeta!: SourceMeta;

  // Optimistic update state — null when inactive.
  let optimistic: OptimisticEntry<T> | null = null;

  // pendingCount tracks in-flight requests including joiners for the same key.
  let pendingCount = 0;

  // latestKey prevents stale out-of-order responses from overwriting newer results.
  let latestKey = '';

  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  const inflight = new Map<string, { controller: AbortController; promise: Promise<void> }>();

  const toQuery = (): RemoteSourceQuery<TFilter, TSort> => ({ filter, limit, page, search, sort });

  const toFetchQuery = (): RemoteQuery<TFilter, TSort> => ({
    filter,
    limit,
    page,
    search: search || undefined,
    sort,
  });

  const assign = (res: RemoteResult<T>) => {
    items = res.items;
    total = res.total ?? 0;

    if (optimistic) optimistic.active = false;

    optimistic = null;

    page = Math.min(Math.max(1, page), pageCount(total, limit));
  };

  const refreshMeta = () => {
    cachedMeta = createMeta({
      errorMessage: error,
      isLoading: pendingCount > 0,
      isSearchPending: core.isScheduled,
      pageNumber: page,
      pageSize: limit,
      totalItems: optimistic?.total ?? total,
    });
  };

  const notify = () => {
    refreshMeta();
    core.notify();
  };

  const fetchQuery = async (q: RemoteQuery<TFilter, TSort>): Promise<void> => {
    const key = keyOf(q);
    const startTime = Date.now();

    latestKey = key;

    // Abort superseded requests.
    for (const [k, entry] of inflight) {
      if (k !== key) entry.controller.abort();
    }

    // Join an identical in-flight request rather than issuing a duplicate.
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
          assign(result);
          error = null;
          cfg.onFetch?.({ durationMs: Date.now() - startTime, query: q, status: 'success' });
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;

        if (key === latestKey) {
          if (optimistic?.active) {
            // Restore pre-optimistic state on failure.
            optimistic.active = false;
            items = optimistic.prevItems;
            total = optimistic.prevTotal;
            optimistic = null;
          } else {
            items = [];
            total = 0;
          }

          error = extractError(reason);
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

  const doUpdate = () => fetchQuery(toFetchQuery());

  refreshMeta();

  if (autoFetch) {
    void doUpdate();
  }

  if (refreshIntervalMs > 0) {
    refreshTimer = setInterval(() => {
      void doUpdate();
    }, refreshIntervalMs);
  }

  const api: RemoteSource<T, TFilter, TSort> = {
    get current() {
      return optimistic?.items ?? items;
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

    goTo(p: number): Promise<void> {
      page = Math.max(1, Math.trunc(p));

      return doUpdate();
    },

    goToLast(): Promise<void> {
      return api.goTo(pageCount(total, limit));
    },

    hydrate(patch): Promise<void> {
      let changed = false;

      if (patch.limit !== undefined) {
        const nextLimit = Math.max(1, Math.trunc(patch.limit));

        if (nextLimit !== limit) {
          limit = nextLimit;
          changed = true;
        }
      }

      if (patch.search !== undefined && patch.search !== search) {
        search = patch.search;
        changed = true;
      }

      if ('filter' in patch && patch.filter !== filter) {
        filter = patch.filter;
        changed = true;
      }

      if ('sort' in patch && patch.sort !== sort) {
        sort = patch.sort;
        changed = true;
      }

      if (patch.page !== undefined) {
        const nextPage = Math.max(1, Math.trunc(patch.page));

        if (nextPage !== page) {
          page = nextPage;
          changed = true;
        }
      }

      if (changed) return doUpdate();

      return Promise.resolve();
    },

    get meta() {
      return cachedMeta;
    },

    next(): Promise<void> {
      if (page >= pageCount(total, limit)) return Promise.resolve();

      page += 1;

      return doUpdate();
    },

    optimisticUpdate(mutator, options) {
      if (optimistic) {
        throw new Error(
          'An optimistic update is already pending. Call the rollback function before starting a new one.',
        );
      }

      const entry: OptimisticEntry<T> = {
        active: true,
        items: mutator(items),
        prevItems: items,
        prevTotal: total,
        total: options?.total ?? total,
      };

      const rollback = () => {
        if (!entry.active) return;

        entry.active = false;
        items = entry.prevItems;
        total = entry.prevTotal;
        optimistic = null;
        notify();
      };

      optimistic = entry;
      notify();

      return rollback;
    },

    prev(): Promise<void> {
      if (page <= 1) return Promise.resolve();

      page -= 1;

      return doUpdate();
    },

    ready(): Promise<void> {
      return core.ready(() => pendingCount === 0 && !core.isScheduled);
    },

    refresh(): Promise<void> {
      return doUpdate();
    },

    reset(): Promise<void> {
      page = 1;
      limit = limitDefault;
      search = '';
      filter = cfg.filter as TFilter | undefined;
      sort = cfg.sort as TSort | undefined;

      return doUpdate();
    },

    search(q: string) {
      search = q;
      page = 1;
      core.schedule(() => {
        void doUpdate();
      }, debounceMs);
      notify();
    },

    searchNow(q: string): Promise<void> {
      core.cancelTimer();
      search = q;
      page = 1;

      return doUpdate();
    },

    setFilter(f?: TFilter): Promise<void> {
      filter = f;
      page = 1;

      return doUpdate();
    },

    setLimit(n: number): Promise<void> {
      limit = Math.max(1, Math.trunc(n));
      page = 1;

      return doUpdate();
    },

    setSort(s?: TSort): Promise<void> {
      sort = s;
      page = 1;

      return doUpdate();
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    toQuery() {
      return toQuery();
    },
  };

  return api;
}
