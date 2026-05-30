import type { LocalConfig, LocalSource, Predicate, Sorter, SourceMeta, SourceQuery } from './types';

import { createSourceCore } from './core';
import { clampPage, createMeta, pageCount } from './pagination';

const DEFAULTS = { debounceMs: 300, limit: 10 } as const;

/**
 * Default search: case-insensitive JSON substring match.
 * For production use with large datasets or domain-specific relevance, supply a custom `searchFn`.
 */
const defaultSearchFn = <T>(items: readonly T[], query: string): readonly T[] => {
  const q = query.toLowerCase();

  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
};

export function createLocalSource<T>(initialData: readonly T[], cfg: LocalConfig<T> = {}): LocalSource<T> {
  const core = createSourceCore();
  const debounceMs = cfg.debounceMs ?? DEFAULTS.debounceMs;
  const searchFn = cfg.searchFn ?? (defaultSearchFn as (items: readonly T[], query: string) => readonly T[]);
  const limitDefault = Math.max(1, cfg.limit ?? DEFAULTS.limit);

  let rawData: readonly T[] = [...initialData];
  let limit = limitDefault;
  let filterFn: Predicate<T> | undefined = cfg.filter;
  let sortFn: Sorter<T> | undefined = cfg.sort;
  let query = '';
  let page = 1;
  let view: readonly T[] = [];
  let cachedCurrent!: readonly T[];
  let cachedMeta!: SourceMeta;

  const refreshCache = () => {
    if (!view.length) {
      cachedCurrent = [];
    } else {
      const start = (page - 1) * limit;

      cachedCurrent = view.slice(start, start + limit);
    }

    cachedMeta = createMeta({
      errorMessage: null,
      isLoading: false,
      isSearchPending: core.isScheduled,
      pageNumber: page,
      pageSize: limit,
      totalItems: view.length,
    });
  };

  const notify = () => {
    refreshCache();
    core.notify();
  };

  const recompute = () => {
    let next = query ? searchFn(rawData, query) : rawData;

    if (filterFn) {
      next = next.filter(filterFn);
    }

    if (sortFn) {
      next = [...next].sort(sortFn);
    }

    page = clampPage(page, pageCount(next.length, limit));
    view = next;
  };

  const emit = () => {
    recompute();
    notify();
  };

  recompute();
  refreshCache();

  return {
    get current() {
      return cachedCurrent;
    },

    dispose() {
      core.dispose();
    },

    flush(): Promise<void> {
      return core.flush(() => {
        emit();

        return Promise.resolve();
      });
    },

    goTo(p: number): Promise<void> {
      page = clampPage(Math.trunc(p), pageCount(view.length, limit));
      notify();

      return Promise.resolve();
    },

    goToLast(): Promise<void> {
      page = pageCount(view.length, limit);
      notify();

      return Promise.resolve();
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

      if (patch.search !== undefined && patch.search !== query) {
        query = patch.search;
        changed = true;
      }

      if ('filter' in patch && patch.filter !== filterFn) {
        filterFn = patch.filter as Predicate<T> | undefined;
        changed = true;
      }

      if ('sort' in patch && patch.sort !== sortFn) {
        sortFn = patch.sort as Sorter<T> | undefined;
        changed = true;
      }

      if (patch.page !== undefined) {
        const nextPage = Math.max(1, Math.trunc(patch.page));

        if (nextPage !== page) {
          page = nextPage;
          changed = true;
        }
      }

      if (changed) emit();

      return Promise.resolve();
    },

    get meta() {
      return cachedMeta;
    },

    next(): Promise<void> {
      const pages = pageCount(view.length, limit);

      if (page >= pages) return Promise.resolve();

      page += 1;
      notify();

      return Promise.resolve();
    },

    prev(): Promise<void> {
      if (page <= 1) return Promise.resolve();

      page -= 1;
      notify();

      return Promise.resolve();
    },

    reset(): Promise<void> {
      limit = limitDefault;
      filterFn = cfg.filter;
      sortFn = cfg.sort;
      query = '';
      page = 1;
      core.cancelTimer();
      emit();

      return Promise.resolve();
    },

    search(searchTerm: string) {
      query = searchTerm;
      page = 1;
      core.schedule(() => emit(), debounceMs);
      notify();
    },

    searchNow(searchTerm: string): Promise<void> {
      core.cancelTimer();
      query = searchTerm;
      page = 1;
      emit();

      return Promise.resolve();
    },

    setData(data: readonly T[]): Promise<void> {
      rawData = [...data];
      page = 1;
      emit();

      return Promise.resolve();
    },

    setFilter(filter?: Predicate<T>): Promise<void> {
      filterFn = filter;
      page = 1;
      emit();

      return Promise.resolve();
    },

    setLimit(nextLimit: number): Promise<void> {
      limit = Math.max(1, Math.trunc(nextLimit));
      page = 1;
      emit();

      return Promise.resolve();
    },

    setSort(sort?: Sorter<T>): Promise<void> {
      sortFn = sort;
      page = 1;
      emit();

      return Promise.resolve();
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    toQuery(): SourceQuery {
      return { limit, page, search: query };
    },
  };
}
