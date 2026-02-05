/** biome-ignore-all lint/suspicious/noAssignInExpressions: - */
import { debounce } from '../function/debounce';
import type { Predicate } from '../types';

type Sorter<T> = (a: T, b: T) => number;
type Searcher<T> = (items: readonly T[], query: string, tone: number) => readonly T[];

type Config<T> = {
  filterFn?: Predicate<T>;
  limit?: number;
  sortFn?: Sorter<T>;
  searchFn?: Searcher<T>;
  searchTone?: number; // intensity/threshold passed to searchFn
  debounceMs?: number; // debounce for search()
};

type Meta = Readonly<{
  start: number; // 1-based
  end: number; // inclusive
  total: number;
  page: number; // 1-based
  pages: number;
  isFirst: boolean;
  isLast: boolean;
  isEmpty: boolean;
  limit: number;
}>;

type BatchParams<T> = (ctx: {
  setLimit: (n: number) => void;
  setFilter: (p: Predicate<T>) => void;
  setSort: (s?: Sorter<T>) => void;
  setQuery: (q: string) => void;
  setData: (d: readonly T[]) => void;
  goTo: (p: number) => void;
}) => void;

const DEFAULTS = {
  debounceMs: 300,
  limit: 10,
  minLimit: 1,
  searchTone: 0.5,
} as const;

export function list<T>(initialData: readonly T[], config: Config<T> = {}) {
  // state
  let rawData: readonly T[] = [...initialData];
  let limit = Math.max(DEFAULTS.minLimit, config.limit ?? DEFAULTS.limit);
  let filterFn: Predicate<T> = config.filterFn ?? (() => true);
  let sortFn: Sorter<T> | undefined = config.sortFn;
  const searchFn: Searcher<T> | undefined = config.searchFn;
  const searchTone = config.searchTone ?? DEFAULTS.searchTone;
  const debounceMs = config.debounceMs ?? DEFAULTS.debounceMs;

  let query = '';
  let offset = 0; // zero-based page index
  let view: readonly T[] = recomputeView();

  function recomputeView(): readonly T[] {
    let result = rawData;

    if (searchFn && query) {
      result = searchFn(result, query, searchTone);
    }

    if (filterFn) {
      result = result.filter(filterFn);
    }

    if (sortFn) {
      // Copy before sort to avoid mutating the original array
      result = [...result].sort(sortFn);
    } else {
      // Keep a shallow copy to avoid accidental external mutation
      result = [...result];
    }

    // Clamp offset to new bounds
    const maxOffset = Math.max(0, Math.ceil(result.length / limit) - 1);
    offset = Math.min(offset, maxOffset);

    return result;
  }

  function currentSlice(): readonly T[] {
    if (view.length === 0) return [];
    const start = offset * limit;
    const end = start + limit;
    return view.slice(start, end);
  }

  function update(): readonly T[] {
    view = recomputeView();
    return currentSlice();
  }

  function clampPageIndex(i: number) {
    return Math.max(0, Math.min(i, Math.max(0, Math.ceil(view.length / limit) - 1)));
  }

  // Debounced search that updates view; expose cancel/flush/pending if your debouncing returns them
  const search = debounce((q: string) => {
    query = q;
    return update();
  }, debounceMs);

  return {
    // batch updates without multiple recomputing
    batch(mutator: BatchParams<T>): readonly T[] {
      let nextLimit = limit;
      let nextFilter = filterFn;
      let nextSort = sortFn;
      let nextQuery = query;
      let nextData = rawData;
      let nextOffset = offset;

      mutator({
        goTo: (p: number) => (nextOffset = clampPageIndex(p - 1)),
        setData: (d: readonly T[]) => {
          nextData = [...d];
          nextOffset = 0;
        },
        setFilter: (p: Predicate<T>) => (nextFilter = p),
        setLimit: (n: number) => (nextLimit = Math.max(DEFAULTS.minLimit, n)),
        setQuery: (q: string) => (nextQuery = q),
        setSort: (s?: Sorter<T>) => (nextSort = s),
      });

      // apply changes and update once
      limit = nextLimit;
      filterFn = nextFilter;
      sortFn = nextSort;
      query = nextQuery;
      rawData = nextData;
      offset = nextOffset;

      return update();
    },
    // read current page items
    get current(): readonly T[] {
      return currentSlice();
    },
    // data setters
    set data(newData: readonly T[]) {
      rawData = [...newData];
      offset = 0;
      update();
    },
    get data(): readonly T[] {
      return rawData;
    },
    filter(predicate: Predicate<T>): readonly T[] {
      filterFn = predicate;
      offset = 0;
      return update();
    },
    goTo(page: number): readonly T[] {
      // page is 1-based
      offset = clampPageIndex(page - 1);
      return currentSlice();
    },
    // configuration setters (mutators return current page for consistency)
    set limit(newLimit: number) {
      const next = Math.max(DEFAULTS.minLimit, newLimit);
      if (next !== limit) {
        limit = next;
        update();
      }
    },
    // read meta
    get meta(): Meta {
      const total = view.length;
      const pages = Math.max(1, Math.ceil(total / limit));
      const isEmpty = total === 0;
      const page = Math.min(offset + 1, pages);
      const start = isEmpty ? 0 : offset * limit + 1;
      const end = isEmpty ? 0 : Math.min(offset * limit + limit, total);
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
    // navigation
    next(): readonly T[] {
      if (offset < Math.ceil(view.length / limit) - 1) {
        offset++;
      }
      return currentSlice();
    },
    // get all pages lazily (generator)
    *pages(): IterableIterator<readonly T[]> {
      const totalPages = Math.ceil(view.length / limit);
      for (let i = 0; i < totalPages; i++) {
        const start = i * limit;
        yield view.slice(start, start + limit);
      }
    },
    prev(): readonly T[] {
      if (offset > 0) {
        offset--;
      }
      return currentSlice();
    },
    // reset helper
    reset(): readonly T[] {
      offset = 0;
      query = '';
      filterFn = config.filterFn ?? (() => true);
      sortFn = config.sortFn;
      limit = Math.max(DEFAULTS.minLimit, config.limit ?? DEFAULTS.limit);
      return update();
    },
    // search
    search, // debounced; use search.flush() to force immediate update
    searchNow(q: string): readonly T[] {
      query = q;
      return update();
    },
    sort(fn?: Sorter<T>): readonly T[] {
      sortFn = fn;
      return update();
    },
    // iterable (pages) – lazy
    *[Symbol.iterator](): IterableIterator<readonly T[]> {
      yield* this.pages();
    },
  };
}
