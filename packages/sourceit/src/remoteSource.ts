import type { RemoteConfig, RemoteSource, RemoteSourceSnapshot } from './types';

import { decodeRemoteQueryParams, encodeRemoteQueryParams } from './codecs';
import { createMeta, pageCount } from './pagination';

type RemoteQuery<F, S> = Readonly<{
  filter?: F;
  limit: number;
  page: number;
  search?: string;
  sort?: S;
}>;

type RemoteResult<T> = Readonly<{ items: readonly T[]; total: number }>;

export function createRemoteSource<T, F = unknown, S = unknown>(cfg: RemoteConfig<T, F, S>): RemoteSource<T, F, S> {
  const listeners = new Set<() => void>();

  const limitDefault = Math.max(1, cfg.limit ?? 10);
  const debounceMs = cfg.debounceMs ?? 300;

  let page = 1;
  let limit = limitDefault;
  let search = '';
  let filter = cfg.initialFilter as F | undefined;
  let sort = cfg.initialSort as S | undefined;

  let items: readonly T[] = [];
  let total = 0;
  let loading = false;
  let error: string | null = null;

  const inflight = new Map<string, Promise<void>>();

  const keyOf = (q: RemoteQuery<F, S>) => JSON.stringify(q, Object.keys(q).sort());

  const queryOf = (): RemoteQuery<F, S> => ({
    filter,
    limit,
    page,
    search: search || undefined,
    sort,
  });

  const snapshot = (): RemoteSourceSnapshot<F, S> => ({
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

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const fetchQuery = async (q: RemoteQuery<F, S>) => {
    const key = keyOf(q);

    if (inflight.has(key)) {
      await inflight.get(key);

      return;
    }

    loading = true;
    error = null;
    notify();

    const promise = cfg
      .fetch(q)
      .then((result) => {
        assign(result);
      })
      .catch((reason) => {
        error = reason?.message ?? 'Request failed';
        items = [];
        total = 0;
      })
      .finally(() => {
        inflight.delete(key);
        loading = false;
        notify();
      });

    inflight.set(key, promise);
    await promise;
  };

  const doUpdate = async () => {
    await fetchQuery(queryOf());
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = () => {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      timer = undefined;
      void doUpdate();
    }, debounceMs);
  };

  const api: RemoteSource<T, F, S> = {
    get current() {
      return items;
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
        void doUpdate();
      }
    },
    fromQueryParams(params) {
      api.hydrate(decodeRemoteQueryParams(params, limitDefault));
    },
    goTo(p) {
      page = Math.max(1, Math.trunc(p));
      void doUpdate();
    },
    goToFirst() {
      api.goTo(1);
    },
    goToLast() {
      const pages = Math.max(1, Math.ceil(total / limit));

      api.goTo(pages);
    },
    hydrate(state) {
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

      if (changed) {
        void doUpdate();
      }
    },
    get meta() {
      return createMeta({
        errorMessage: error,
        isLoading: loading,
        isPending: timer !== undefined,
        pageNumber: page,
        pageSize: limit,
        totalItems: total,
      });
    },
    next() {
      const pages = Math.max(1, Math.ceil(total / limit));

      if (page < pages) {
        page += 1;
        void doUpdate();
      }
    },
    prev() {
      page = Math.max(1, page - 1);
      void doUpdate();
    },
    ready() {
      if (!loading && !timer && inflight.size === 0) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const checkReady = () => {
          if (!loading && !timer && inflight.size === 0) {
            listeners.delete(checkReady);
            resolve();
          }
        };

        listeners.add(checkReady);
        checkReady();
      });
    },
    refresh() {
      void doUpdate();
    },
    reset() {
      page = 1;
      limit = limitDefault;
      search = '';
      filter = cfg.initialFilter as F | undefined;
      sort = cfg.initialSort as S | undefined;
      void doUpdate();
    },
    search(q, immediate = false) {
      search = q;
      page = 1;

      if (immediate) {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }

        void doUpdate();

        return;
      }

      debounced();
    },
    setFilter(f) {
      filter = f;
      page = 1;
      void doUpdate();
    },
    setLimit(n) {
      limit = Math.max(1, n);
      page = 1;
      void doUpdate();
    },
    setSort(s) {
      sort = s;
      page = 1;
      void doUpdate();
    },
    snapshot() {
      return snapshot();
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    toQueryParams() {
      return encodeRemoteQueryParams(snapshot());
    },
    update(mutator) {
      let nextPage = page;
      let nextLimit = limit;
      let nextSearch = search;
      let nextFilter = filter as F | undefined;
      let nextSort = sort as S | undefined;

      mutator({
        goTo: (p: number) => {
          nextPage = Math.max(1, Math.trunc(p));
        },
        search: (q: string) => {
          nextSearch = q;
          nextPage = 1;
        },
        setFilter: (f) => {
          nextFilter = f;
          nextPage = 1;
        },
        setLimit: (n) => {
          nextLimit = Math.max(1, n);
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

      void doUpdate();
    },
  };

  return api;
}
