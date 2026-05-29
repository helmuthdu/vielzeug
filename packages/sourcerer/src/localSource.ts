import type { LocalBatchContext, LocalConfig, LocalSource, Predicate, Sorter, SourceMeta, SourceQuery } from './types';

import { decodeLocalQueryParams } from './codecs';
import { clampOffset, createMeta, pageCount } from './pagination';
import { containsSearch as defaultSearch } from './search';

const DEFAULTS = { debounceMs: 300, limit: 10 } as const;

export function createLocalSource<T>(initialData: readonly T[], cfg: LocalConfig<T> = {}): LocalSource<T> {
  const listeners = new Set<() => void>();
  const searchFn = cfg.searchFn ?? defaultSearch;

  let rawData: readonly T[] = [...initialData];
  let limit = Math.max(1, cfg.limit ?? DEFAULTS.limit);
  let filterFn: Predicate<T> | undefined = cfg.filter;
  let sortFn: Sorter<T> | undefined = cfg.sort;
  let query = '';
  let offset = 0;
  let view: readonly T[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cachedCurrent!: readonly T[];
  let cachedMeta!: SourceMeta;

  const refreshCache = () => {
    if (!view.length) {
      cachedCurrent = [];
    } else {
      const start = offset * limit;

      cachedCurrent = view.slice(start, start + limit);
    }

    cachedMeta = createMeta({
      errorMessage: null,
      isLoading: false,
      isSearchPending: timer !== undefined,
      pageNumber: offset + 1,
      pageSize: limit,
      totalItems: view.length,
    });
  };

  const notify = () => {
    refreshCache();

    for (const listener of listeners) {
      listener();
    }
  };

  const recompute = () => {
    let next = query ? searchFn(rawData, query) : rawData;

    if (filterFn) {
      next = next.filter(filterFn);
    }

    if (sortFn) {
      next = [...next].sort(sortFn);
    }

    const pages = pageCount(next.length, limit);

    offset = clampOffset(offset, pages);
    view = next;
  };

  const emit = () => {
    recompute();
    notify();
  };

  const toQuery = (): SourceQuery => ({
    limit,
    page: offset + 1,
    search: query,
  });

  const scheduleSearch = (searchTerm: string) => {
    if (timer) {
      clearTimeout(timer);
    }

    query = searchTerm;
    offset = 0;

    timer = setTimeout(() => {
      timer = undefined;
      emit();
    }, cfg.debounceMs ?? DEFAULTS.debounceMs);

    notify();
  };

  const searchNow = (searchTerm: string) => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    query = searchTerm;
    offset = 0;
    emit();
  };

  const batch = (mutator: (ctx: LocalBatchContext<T>) => void) => {
    let nextLimit = limit;
    let nextFilter = filterFn;
    let nextSort = sortFn;
    let nextQuery = query;
    let nextData = rawData;
    let nextOffset = offset;

    mutator({
      goTo: (page) => {
        nextOffset = Math.max(0, Math.trunc(page) - 1);
      },
      search: (searchTerm) => {
        nextQuery = searchTerm;
        nextOffset = 0;
      },
      setData: (data) => {
        nextData = [...data];
        nextOffset = 0;
      },
      setFilter: (filter) => {
        nextFilter = filter;
        nextOffset = 0;
      },
      setLimit: (patchLimit) => {
        nextLimit = Math.max(1, Math.trunc(patchLimit));
        nextOffset = 0;
      },
      setSort: (sort) => {
        nextSort = sort;
        nextOffset = 0;
      },
    });

    limit = nextLimit;
    filterFn = nextFilter;
    sortFn = nextSort;
    query = nextQuery;
    rawData = nextData;
    offset = nextOffset;
    emit();
  };

  recompute();
  refreshCache();

  return {
    batch,
    commit() {
      if (!timer) {
        return;
      }

      clearTimeout(timer);
      timer = undefined;
      emit();
    },
    get current() {
      return cachedCurrent;
    },
    fromQueryParams(params) {
      this.restore(decodeLocalQueryParams(params, cfg.limit ?? DEFAULTS.limit));
    },
    goTo(page) {
      offset = clampOffset(page - 1, pageCount(view.length, limit));
      notify();
    },
    goToLast() {
      this.goTo(pageCount(view.length, limit));
    },
    get meta() {
      return cachedMeta;
    },
    next() {
      this.goTo(this.meta.pageNumber + 1);
    },
    prev() {
      this.goTo(this.meta.pageNumber - 1);
    },
    reset() {
      limit = Math.max(1, cfg.limit ?? DEFAULTS.limit);
      filterFn = cfg.filter;
      sortFn = cfg.sort;
      query = '';
      offset = 0;
      emit();
    },
    restore(state) {
      let changed = false;

      if (state.limit !== undefined) {
        const nextLimit = Math.max(1, Math.trunc(state.limit));

        if (nextLimit !== limit) {
          limit = nextLimit;
          changed = true;
        }
      }

      if (state.search !== undefined && state.search !== query) {
        query = state.search;
        changed = true;
      }

      if (state.page !== undefined) {
        const nextOffset = Math.max(0, Math.trunc(state.page) - 1);

        if (nextOffset !== offset) {
          offset = nextOffset;
          changed = true;
        }
      }

      if (changed) {
        emit();
      }
    },
    search(searchTerm) {
      scheduleSearch(searchTerm);
    },
    searchNow,
    setData(data) {
      rawData = [...data];
      offset = 0;
      emit();
    },
    setFilter(filter) {
      filterFn = filter;
      offset = 0;
      emit();
    },
    setLimit(nextLimit) {
      limit = Math.max(1, Math.trunc(nextLimit));
      offset = 0;
      emit();
    },
    setSort(sort) {
      sortFn = sort;
      offset = 0;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    toQuery() {
      return toQuery();
    },
  };
}
