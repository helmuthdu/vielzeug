import type { Predicate, Sorter } from '../types';
import { search as defaultSearch } from './search';

// #region Meta
export type Meta = Readonly<{
  end: number; // inclusive
  isEmpty: boolean;
  isFirst: boolean;
  isLast: boolean;
  limit: number;
  page: number; // 1-based
  pages: number;
  start: number; // 1-based
  total: number;
}>;
// #endregion Meta

// #region List
export type List<T, F, S> = {
  readonly current: readonly T[];
  readonly meta: Meta;
  subscribe(listener: () => void): () => void;

  goTo(page: number): void;
  next(): void;
  prev(): void;
  reset(): void;
  search(query: string, opts?: { immediate?: boolean }): void;
  setData?(data: readonly T[]): void; // implemented by local
  setFilter(filter: F): void;
  setLimit(n: number): void;
  setSort(sort?: S): void;

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
  ): void;
};
// #endregion List

// #region LocalConfig
type LocalConfig<T> = Readonly<{
  debounceMs?: number;
  filterFn?: Predicate<T>;
  limit?: number;
  searchFn?: (items: readonly T[], query: string, tone: number) => readonly T[];
  searchTone?: number;
  sortFn?: Sorter<T>;
}>;
// #endregion LocalConfig

export function list<T>(initialData: readonly T[], cfg: LocalConfig<T> = {}): List<T, Predicate<T>, Sorter<T>> {
  const listeners = new Set<() => void>();

  const DEFAULTS = { debounceMs: 300, limit: 10, searchTone: 0.5 } as const;

  let rawData: readonly T[] = [...initialData];
  let limit = Math.max(1, cfg.limit ?? DEFAULTS.limit);
  let filterFn: Predicate<T> = cfg.filterFn ?? (() => true);
  let sortFn: Sorter<T> | undefined = cfg.sortFn;
  const searchFn = cfg.searchFn ?? ((items: readonly T[], q: string, t: number) => defaultSearch([...items], q, t));
  const searchTone = cfg.searchTone ?? DEFAULTS.searchTone;

  let query = '';
  let offset = 0;
  let view: readonly T[] = [];

  const notify = () => {
    for (const l of listeners) {
      l();
    }
  };

  const recompute = () => {
    let arr = rawData;

    if (query) arr = searchFn(arr, query, searchTone);
    if (filterFn) arr = arr.filter(filterFn);
    arr = sortFn ? [...arr].sort(sortFn) : [...arr];

    const pages = Math.max(1, Math.ceil(arr.length / limit));
    offset = Math.min(offset, pages - 1);
    view = arr;
  };

  const slice = (): readonly T[] => {
    if (!view.length) return [];
    const start = offset * limit;
    return view.slice(start, start + limit);
  };

  const update = () => {
    recompute();
    notify();
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const debouncedSearch = (q: string, ms: number) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      query = q;
      timer = undefined;
      void update();
    }, ms);
  };

  // initial compute
  recompute();

  return {
    batch(mutator) {
      let nextLimit = limit;
      let nextFilter = filterFn;
      let nextSort = sortFn;
      let nextQuery = query;
      let nextData = rawData;
      let nextOffset = offset;

      const clamp = (i: number, total: number, lim: number) =>
        Math.max(0, Math.min(i, Math.max(0, Math.ceil(total / lim) - 1)));

      mutator({
        goTo: (p) => {
          nextOffset = clamp(p - 1, view.length, nextLimit);
        },
        setData: (d) => {
          nextData = [...d];
          nextOffset = 0;
        },
        setFilter: (f) => {
          nextFilter = f;
        },
        setLimit: (n) => {
          nextLimit = Math.max(1, n);
        },
        setQuery: (q) => {
          nextQuery = q;
          nextOffset = 0;
        },
        setSort: (s) => {
          nextSort = s;
        },
      });

      // apply once
      limit = nextLimit;
      filterFn = nextFilter;
      sortFn = nextSort;
      query = nextQuery;
      rawData = nextData;
      offset = nextOffset;

      update();
    },
    get current() {
      return slice();
    },
    goTo(page) {
      const pages = Math.max(1, Math.ceil(view.length / limit));
      offset = Math.max(0, Math.min(page - 1, pages - 1));
      notify();
    },
    get meta() {
      const total = view.length;
      const pages = Math.max(1, Math.ceil(total / limit));
      const isEmpty = total === 0;
      const page = Math.min(offset + 1, pages);
      const start = isEmpty ? 0 : (page - 1) * limit + 1;
      const end = isEmpty ? 0 : Math.min(page * limit, total);
      return {
        end,
        isEmpty,
        isFirst: page <= 1,
        isLast: page >= pages,
        limit,
        page,
        pages,
        start,
        total,
      };
    },
    next() {
      const pages = Math.max(1, Math.ceil(view.length / limit));
      if (offset < pages - 1) {
        offset++;
        notify();
      }
    },
    prev() {
      if (offset > 0) {
        offset--;
        notify();
      }
    },
    reset() {
      limit = Math.max(1, cfg.limit ?? DEFAULTS.limit);
      filterFn = cfg.filterFn ?? (() => true);
      sortFn = cfg.sortFn;
      query = '';
      offset = 0;
      update();
    },
    search(q, opts) {
      query = q;
      offset = 0;
      if (opts?.immediate) {
        update();
      } else {
        debouncedSearch(q, cfg.debounceMs ?? DEFAULTS.debounceMs);
      }
    },
    setData(data) {
      rawData = [...data];
      offset = 0;
      update();
    },
    setFilter(f) {
      filterFn = f;
      offset = 0;
      update();
    },
    setLimit(n) {
      limit = Math.max(1, n);
      offset = 0;
      update();
    },
    setSort(s) {
      sortFn = s;
      update();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
