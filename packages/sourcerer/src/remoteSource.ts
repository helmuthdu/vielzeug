import type { RemoteBatchContext, RemoteConfig, RemoteSource, RemoteSourceQuery, SourceMeta } from './types';

import { decodeRemoteQueryParams } from './codecs';
import { createMeta, pageCount } from './pagination';

type RemoteQuery<TFilter, TSort> = Readonly<{
  filter?: TFilter;
  limit: number;
  page: number;
  search?: string;
  sort?: TSort;
}>;

type RemoteResult<T> = Readonly<{ items: readonly T[]; total: number }>;

// Recursively sort object keys for stable, order-independent cache keys.
const keyOf = (q: unknown): string =>
  JSON.stringify(q, (_, value: unknown) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};

      for (const k of Object.keys(value as object).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }

      return sorted;
    }

    return value;
  });

export function createRemoteSource<T, TFilter = unknown, TSort = unknown>(
  cfg: RemoteConfig<T, TFilter, TSort>,
): RemoteSource<T, TFilter, TSort> {
  const listeners = new Set<() => void>();

  const limitDefault = Math.max(1, cfg.limit ?? 10);
  const debounceMs = cfg.debounceMs ?? 300;

  let page = 1;
  let limit = limitDefault;
  let search = '';
  let filter = cfg.filter as TFilter | undefined;
  let sort = cfg.sort as TSort | undefined;

  let items: readonly T[] = [];
  let total = 0;
  let error: string | null = null;
  let cachedMeta!: SourceMeta;

  // pendingCount tracks the number of in-flight requests across all concurrent calls,
  // including joiners that attach to an existing in-flight request for the same key.
  // isLoading is derived from pendingCount > 0 so it stays true until every caller is settled.
  let pendingCount = 0;

  // latestKey is the key of the most recently dispatched query.
  // Only the response whose key matches latestKey at the time of resolution is applied to state,
  // preventing stale out-of-order responses from overwriting newer results.
  let latestKey = '';

  const inflight = new Map<string, Promise<void>>();

  const queryOf = (): RemoteQuery<TFilter, TSort> => ({
    filter,
    limit,
    page,
    search: search || undefined,
    sort,
  });

  const toQuery = (): RemoteSourceQuery<TFilter, TSort> => ({
    filter,
    limit,
    page,
    search,
    sort,
  });

  const assign = (res: RemoteResult<T>) => {
    items = res.items;
    total = res.total ?? 0;

    const pages = pageCount(total, limit);

    page = Math.min(Math.max(1, page), pages);
  };

  const refreshMeta = () => {
    cachedMeta = createMeta({
      errorMessage: error,
      isLoading: pendingCount > 0,
      isSearchPending: timer !== undefined,
      pageNumber: page,
      pageSize: limit,
      totalItems: total,
    });
  };

  const notify = () => {
    refreshMeta();

    for (const listener of listeners) {
      listener();
    }
  };

  const fetchQuery = async (q: RemoteQuery<TFilter, TSort>): Promise<void> => {
    const key = keyOf(q);

    latestKey = key;

    // Join an identical in-flight request rather than issuing a duplicate.
    if (inflight.has(key)) {
      pendingCount++;
      notify();

      try {
        await inflight.get(key);
      } finally {
        pendingCount--;
        notify();
      }

      return;
    }

    pendingCount++;
    error = null;
    notify();

    const promise = cfg
      .fetch(q)
      .then((result) => {
        // Only apply if this is still the latest query; discard stale responses.
        if (key === latestKey) {
          assign(result);
          error = null;
        }
      })
      .catch((reason) => {
        if (key === latestKey) {
          error = reason?.message ?? 'Request failed';
          items = [];
          total = 0;
        }
      })
      .finally(() => {
        inflight.delete(key);
        pendingCount--;
        notify();
      });

    inflight.set(key, promise);
    await promise;
  };

  const doUpdate = () => fetchQuery(queryOf());

  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = () => {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      timer = undefined;
      void doUpdate();
    }, debounceMs);

    notify();
  };

  const searchNow = (q: string): Promise<void> => {
    search = q;
    page = 1;

    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    return doUpdate();
  };

  const batch = (mutator: (ctx: RemoteBatchContext<TFilter, TSort>) => void): Promise<void> => {
    let nextPage = page;
    let nextLimit = limit;
    let nextSearch = search;
    let nextFilter = filter as TFilter | undefined;
    let nextSort = sort as TSort | undefined;

    mutator({
      goTo: (p) => {
        nextPage = Math.max(1, Math.trunc(p));
      },
      search: (q) => {
        nextSearch = q;
        nextPage = 1;
      },
      setFilter: (f) => {
        nextFilter = f;
        nextPage = 1;
      },
      setLimit: (n) => {
        nextLimit = Math.max(1, Math.trunc(n));
        nextPage = 1;
      },
      setSort: (s) => {
        nextSort = s;
        nextPage = 1;
      },
    });

    page = nextPage;
    limit = nextLimit;
    search = nextSearch;
    filter = nextFilter;
    sort = nextSort;

    return doUpdate();
  };

  const api: RemoteSource<T, TFilter, TSort> = {
    batch,
    commit() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;

        return doUpdate();
      }

      return Promise.resolve();
    },
    get current() {
      return items;
    },
    fromQueryParams(params) {
      return api.restore(decodeRemoteQueryParams(params, limitDefault));
    },
    goTo(p) {
      page = Math.max(1, Math.trunc(p));

      return doUpdate();
    },
    goToLast() {
      return api.goTo(pageCount(total, limit));
    },
    get meta() {
      return cachedMeta;
    },
    next() {
      const pages = pageCount(total, limit);

      if (page >= pages) return Promise.resolve();

      page += 1;

      return doUpdate();
    },
    prev() {
      if (page <= 1) return Promise.resolve();

      page -= 1;

      return doUpdate();
    },
    ready() {
      if (pendingCount === 0 && !timer) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const checkReady = () => {
          if (pendingCount === 0 && !timer) {
            listeners.delete(checkReady);
            resolve();
          }
        };

        listeners.add(checkReady);
      });
    },
    refresh() {
      return doUpdate();
    },
    reset() {
      page = 1;
      limit = limitDefault;
      search = '';
      filter = cfg.filter as TFilter | undefined;
      sort = cfg.sort as TSort | undefined;

      return doUpdate();
    },
    restore(state) {
      let changed = false;

      if ('limit' in state && state.limit !== undefined) {
        const nextLimit = Math.max(1, Math.trunc(state.limit));

        if (nextLimit !== limit) {
          limit = nextLimit;
          changed = true;
        }
      }

      if ('search' in state && state.search !== undefined) {
        if (state.search !== search) {
          search = state.search;
          changed = true;
        }
      }

      if ('filter' in state) {
        if (state.filter !== filter) {
          filter = state.filter;
          changed = true;
        }
      }

      if ('sort' in state) {
        if (state.sort !== sort) {
          sort = state.sort;
          changed = true;
        }
      }

      if ('page' in state && state.page !== undefined) {
        const nextPage = Math.max(1, Math.trunc(state.page));

        if (nextPage !== page) {
          page = nextPage;
          changed = true;
        }
      }

      if (changed) return doUpdate();

      return Promise.resolve();
    },
    search(query) {
      search = query;
      page = 1;
      debounced();
    },
    searchNow,
    setFilter(f) {
      filter = f;
      page = 1;

      return doUpdate();
    },
    setLimit(n) {
      limit = Math.max(1, Math.trunc(n));
      page = 1;

      return doUpdate();
    },
    setSort(s) {
      sort = s;
      page = 1;

      return doUpdate();
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    toQuery() {
      return toQuery();
    },
  };

  refreshMeta();

  return api;
}
