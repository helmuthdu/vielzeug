import type { RemoteConfig, RemoteSource, RemoteSourceQuery, SourceMeta } from './types';

import { createMeta, pageCount } from './pagination';
import { defaultKeyOf } from './utils';

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
  const listeners = new Set<() => void>();
  const limitDefault = Math.max(1, cfg.limit ?? 10);
  const debounceMs = cfg.debounceMs ?? 300;
  const keyOf = cfg.queryKey ?? defaultKeyOf;
  const autoFetch = cfg.autoFetch ?? true;

  let page = 1;
  let limit = limitDefault;
  let search = '';
  let filter = cfg.filter as TFilter | undefined;
  let sort = cfg.sort as TSort | undefined;

  let items: readonly T[] = [];
  let total = 0;
  let error: string | null = null;
  let cachedMeta!: SourceMeta;

  // Optimistic update state — null when no optimistic update is active.
  let optimistic: OptimisticEntry<T> | null = null;

  // pendingCount tracks the number of in-flight requests across all concurrent calls,
  // including joiners that attach to an existing in-flight request for the same key.
  let pendingCount = 0;

  // latestKey is the key of the most recently dispatched query.
  // Only the response whose key matches latestKey at the time of resolution is applied to state,
  // preventing stale out-of-order responses from overwriting newer results.
  let latestKey = '';

  const inflight = new Map<string, { controller: AbortController; promise: Promise<void> }>();

  let timer: ReturnType<typeof setTimeout> | undefined;

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

    // Deactivate any outstanding rollback closure before clearing the entry.
    if (optimistic) optimistic.active = false;

    optimistic = null;

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
      totalItems: optimistic?.total ?? total,
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

    // Abort any superseded in-flight request (different key).
    for (const [k, entry] of inflight) {
      if (k !== key) {
        entry.controller.abort();
      }
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

    const promise = cfg
      .fetch(q, controller.signal)
      .then((result) => {
        // Only apply if this is still the latest query; discard stale responses.
        if (key === latestKey) {
          assign(result);
          error = null;
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) {
          // Aborted requests are silently discarded — not an error from the user's perspective.
          return;
        }

        if (key === latestKey) {
          if (optimistic?.active) {
            // Restore pre-optimistic state. .finally() will call notify() — avoid double-notify
            // by mutating state here without notifying, then letting .finally() drive the update.
            optimistic.active = false;
            items = optimistic.prevItems;
            total = optimistic.prevTotal;
            optimistic = null;
          } else {
            items = [];
            total = 0;
          }

          error = (reason as { message?: string })?.message ?? 'Request failed';
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

  const doUpdate = () => fetchQuery(queryOf());

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

  refreshMeta();

  if (autoFetch) {
    void doUpdate();
  }

  const api: RemoteSource<T, TFilter, TSort> = {
    commit(): Promise<void> {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;

        return doUpdate();
      }

      return Promise.resolve();
    },

    get current() {
      return optimistic?.items ?? items;
    },

    goTo(p: number): Promise<void> {
      page = Math.max(1, Math.trunc(p));

      return doUpdate();
    },

    goToLast(): Promise<void> {
      return api.goTo(pageCount(total, limit));
    },

    get meta() {
      return cachedMeta;
    },

    next(): Promise<void> {
      const pages = pageCount(total, limit);

      if (page >= pages) return Promise.resolve();

      page += 1;

      return doUpdate();
    },

    optimisticUpdate(mutator: (current: readonly T[]) => readonly T[], options?: { total?: number }): () => void {
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

    restore(state: Partial<RemoteSourceQuery<TFilter, TSort>>): Promise<void> {
      let changed = false;

      if ('limit' in state && state.limit !== undefined) {
        const nextLimit = Math.max(1, Math.trunc(state.limit));

        if (nextLimit !== limit) {
          limit = nextLimit;
          changed = true;
        }
      }

      if ('search' in state && state.search !== undefined && state.search !== search) {
        search = state.search;
        changed = true;
      }

      if ('filter' in state && state.filter !== filter) {
        filter = state.filter;
        changed = true;
      }

      if ('sort' in state && state.sort !== sort) {
        sort = state.sort;
        changed = true;
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

    search(q: string) {
      search = q;
      page = 1;
      debounced();
    },

    searchNow,

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

    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },

    toQuery() {
      return toQuery();
    },

    update(patch: Partial<RemoteSourceQuery<TFilter, TSort>>): Promise<void> {
      let changed = false;

      if (patch.limit !== undefined) {
        const nextLimit = Math.max(1, Math.trunc(patch.limit));

        if (nextLimit !== limit) {
          limit = nextLimit;
          changed = true;
          page = 1;
        }
      }

      if (patch.search !== undefined && patch.search !== search) {
        search = patch.search;
        changed = true;
        page = 1;
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'filter') && patch.filter !== filter) {
        filter = patch.filter;
        changed = true;
        page = 1;
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'sort') && patch.sort !== sort) {
        sort = patch.sort;
        changed = true;
        page = 1;
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
  };

  return api;
}
