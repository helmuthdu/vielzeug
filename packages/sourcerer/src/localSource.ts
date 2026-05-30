import { search as defaultSearch } from '@vielzeug/arsenal';

import type { LocalConfig, LocalSource, Predicate, Sorter, SourceMeta, SourceQuery } from './types';

import { clampOffset, createMeta, pageCount } from './pagination';

const DEFAULTS = { debounceMs: 300, limit: 10 } as const;

export function createLocalSource<T>(initialData: readonly T[], cfg: LocalConfig<T> = {}): LocalSource<T> {
  const listeners = new Set<() => void>();
  const searchFn = cfg.searchFn ?? ((items, q) => defaultSearch(items as T[], q) as readonly T[]);

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

  const searchNow = (searchTerm: string): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    query = searchTerm;
    offset = 0;
    emit();

    return Promise.resolve();
  };

  recompute();
  refreshCache();

  return {
    commit(): Promise<void> {
      if (!timer) {
        return Promise.resolve();
      }

      clearTimeout(timer);
      timer = undefined;
      emit();

      return Promise.resolve();
    },

    get current() {
      return cachedCurrent;
    },

    goTo(page: number): Promise<void> {
      offset = clampOffset(page - 1, pageCount(view.length, limit));
      notify();

      return Promise.resolve();
    },

    goToLast(): Promise<void> {
      return this.goTo(pageCount(view.length, limit));
    },

    get meta() {
      return cachedMeta;
    },

    next(): Promise<void> {
      const pages = pageCount(view.length, limit);

      if (offset >= pages - 1) return Promise.resolve();

      return this.goTo(this.meta.pageNumber + 1);
    },

    prev(): Promise<void> {
      if (offset <= 0) return Promise.resolve();

      return this.goTo(this.meta.pageNumber - 1);
    },

    reset(): Promise<void> {
      limit = Math.max(1, cfg.limit ?? DEFAULTS.limit);
      filterFn = cfg.filter;
      sortFn = cfg.sort;
      query = '';
      offset = 0;
      emit();

      return Promise.resolve();
    },

    restore(state: Partial<SourceQuery>): Promise<void> {
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

      return Promise.resolve();
    },

    search(searchTerm: string) {
      scheduleSearch(searchTerm);
    },

    searchNow,

    setData(data: readonly T[]): Promise<void> {
      rawData = [...data];
      offset = 0;
      emit();

      return Promise.resolve();
    },

    setFilter(filter?: Predicate<T>): Promise<void> {
      filterFn = filter;
      offset = 0;
      emit();

      return Promise.resolve();
    },

    setLimit(nextLimit: number): Promise<void> {
      limit = Math.max(1, Math.trunc(nextLimit));
      offset = 0;
      emit();

      return Promise.resolve();
    },

    setSort(sort?: Sorter<T>): Promise<void> {
      sortFn = sort;
      offset = 0;
      emit();

      return Promise.resolve();
    },

    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },

    toQuery() {
      return toQuery();
    },

    update(patch): Promise<void> {
      let changed = false;

      if (patch.limit !== undefined) {
        const nextLimit = Math.max(1, Math.trunc(patch.limit));

        if (nextLimit !== limit) {
          limit = nextLimit;
          changed = true;
          offset = 0;
        }
      }

      if (patch.search !== undefined && patch.search !== query) {
        query = patch.search;
        changed = true;
        offset = 0;
      }

      if (patch.page !== undefined) {
        const nextOffset = Math.max(0, Math.trunc(patch.page) - 1);

        if (nextOffset !== offset) {
          offset = nextOffset;
          changed = true;
        }
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'filter') && patch.filter !== filterFn) {
        filterFn = patch.filter as Predicate<T> | undefined;
        changed = true;
        offset = 0;
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'sort') && patch.sort !== sortFn) {
        sortFn = patch.sort as Sorter<T> | undefined;
        changed = true;
        offset = 0;
      }

      if (changed) {
        emit();
      }

      return Promise.resolve();
    },
  };
}
