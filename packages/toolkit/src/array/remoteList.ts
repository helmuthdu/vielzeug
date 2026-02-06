// #region RemoteMeta
export type RemoteMeta = Readonly<{
  end: number; // inclusive
  error: string | null;
  isEmpty: boolean;
  isFirst: boolean;
  isLast: boolean;
  limit: number;
  loading: boolean;
  page: number; // 1-based
  pages: number;
  start: number; // 1-based
  total: number;
}>;
// #endregion RemoteMeta

// #region RemoteList
export type RemoteList<T, F, S> = {
  readonly current: readonly T[];
  readonly meta: RemoteMeta;
  subscribe(listener: () => void): () => void;

  goTo(page: number): Promise<void>;
  invalidate?(): void;
  next(): Promise<void>;
  prev(): Promise<void>;
  refresh(): Promise<void>;
  reset(): Promise<void>;
  search(query: string, opts?: { immediate?: boolean }): Promise<void>;
  setFilter(filter: F): Promise<void>;
  setLimit(n: number): Promise<void>;
  setSort(sort?: S): Promise<void>;

  // Batch updates across properties in one recompute/refetch
  batch(
    mutator: (ctx: {
      setLimit(n: number): void;
      setFilter(f: F): void;
      setSort(s?: S): void;
      setQuery(q: string): void;
      setData?(d: readonly T[]): void; // local-only
      goTo(p: number): void; // 1-based
    }) => void,
  ): Promise<void>;
};
// #endregion RemoteList

// #region RemoteConfig
type RemoteQuery<F, S> = Readonly<{
  filter?: F;
  limit: number;
  page: number; // 1-based
  search?: string;
  sort?: S;
}>;

type RemoteResult<T> = Readonly<{ items: readonly T[]; total: number }>;

type RemoteConfig<T, F, S> = Readonly<{
  debounceMs?: number;
  fetch: (q: RemoteQuery<F, S>) => Promise<RemoteResult<T>>;
  initialFilter?: F;
  initialSort?: S;
  limit?: number;
}>;
// #endregion RemoteConfig

export function remoteList<T, F = Record<string, unknown>, S = { key?: string; dir?: 'asc' | 'desc' }>(
  cfg: RemoteConfig<T, F, S>,
): RemoteList<T, F, S> {
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

  const cache = new Map<string, RemoteResult<T>>();
  const inflight = new Map<string, Promise<void>>();

  const keyOf = (q: RemoteQuery<F, S>) => JSON.stringify(q);
  const queryOf = (): RemoteQuery<F, S> => ({
    filter,
    limit,
    page,
    search: search || undefined,
    sort,
  });

  const assign = (res: RemoteResult<T>) => {
    items = res.items;
    total = res.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(Math.max(1, page), pages);
  };

  const notify = () => {
    for (const l of listeners) {
      l();
    }
  };

  const fetchQuery = async (q: RemoteQuery<F, S>) => {
    const k = keyOf(q);
    if (cache.has(k)) {
      assign(cache.get(k)!);
      return;
    }
    if (inflight.has(k)) {
      await inflight.get(k);
      assign(cache.get(k)!);
      return;
    }
    loading = true;
    error = null;
    notify();
    const p = cfg
      .fetch(q)
      .then((res) => {
        cache.set(k, res);
        assign(res);
      })
      .catch((e) => {
        error = e?.message ?? 'Request failed';
        items = [];
        total = 0;
      })
      .finally(() => {
        inflight.delete(k);
        loading = false;
        notify();
      });
    inflight.set(k, p);
    await p;
  };

  const update = async () => {
    await fetchQuery(queryOf());
  };

  // debounced search
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void update();
    }, debounceMs);
  };

  // initial fetch is on the first subscriber or call to refresh; up to you
  return {
    async batch(mutator) {
      // Stage local copies
      let nextPage = page;
      let nextLimit = limit;
      let nextSearch = search;
      let nextFilter = filter as F | undefined;
      let nextSort = sort as S | undefined;

      mutator({
        goTo: (p: number) => {
          nextPage = Math.max(1, p | 0);
        },
        setFilter: (f: F) => {
          nextFilter = f;
          nextPage = 1;
        },
        setLimit: (n) => {
          nextLimit = Math.max(1, n);
          nextPage = 1;
        },
        setQuery: (q: string) => {
          nextSearch = q;
          nextPage = 1;
        },
        setSort: (s?: S) => {
          nextSort = s;
          nextPage = 1;
        },
      });

      // Apply and update at once
      page = nextPage;
      limit = nextLimit;
      search = nextSearch;
      filter = nextFilter;
      sort = nextSort;

      await update();
    },
    get current() {
      return items;
    },
    async goTo(p) {
      page = Math.max(1, p | 0);
      await update();
    },
    invalidate() {
      cache.clear();
    },
    get meta() {
      const isEmpty = total === 0;
      const pages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, pages);
      const start = isEmpty ? 0 : (safePage - 1) * limit + 1;
      const end = isEmpty ? 0 : Math.min(safePage * limit, total);
      return {
        end,
        error,
        isEmpty,
        isFirst: safePage <= 1,
        isLast: safePage >= pages,
        limit,
        loading,
        page: safePage,
        pages,
        start,
        total,
      };
    },
    async next() {
      page += 1;
      await update();
    },
    async prev() {
      page = Math.max(1, page - 1);
      await update();
    },
    async refresh() {
      cache.delete(keyOf(queryOf()));
      await update();
    },
    async reset() {
      page = 1;
      limit = limitDefault;
      search = '';
      filter = cfg.initialFilter as F | undefined;
      sort = cfg.initialSort as S | undefined;
      cache.clear();
      await update();
    },
    async search(q, opts) {
      search = q;
      page = 1;
      if (opts?.immediate) await update();
      else debounced();
    },
    async setFilter(f) {
      filter = f;
      page = 1;
      await update();
    },
    async setLimit(n) {
      limit = Math.max(1, n);
      page = 1;
      await update();
    },
    async setSort(s) {
      sort = s;
      page = 1;
      await update();
    },
    subscribe(listener) {
      listeners.add(listener);
      // optional: trigger an initial load on the first subscription
      if (listeners.size === 1 && items.length === 0 && !loading) {
        void update();
      }
      return () => listeners.delete(listener);
    },
  };
}
