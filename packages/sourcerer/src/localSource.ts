import type { LocalConfig, LocalSource, Sorter, SourceMeta, SourceQuery } from './types';

import { createSourceCore } from './core';
import { clampPage, createMeta, pageCount } from './pagination';
import { SourceError } from './types';
import { extractError } from './utils';

const defaultSearchFn = <T>(items: readonly T[], query: string): readonly T[] => {
  const q = query.toLowerCase();

  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
};

/** Creates an in-memory paginatable source with optional async filter and sort support. */
export function createLocalSource<T>(data: readonly T[], cfg: LocalConfig<T> = {}): LocalSource<T> {
  const core = createSourceCore();

  // ── Config ──────────────────────────────────────────────────────────────────
  const debounceMs = cfg.debounceMs ?? 300;
  const searchFn = cfg.searchFn ?? defaultSearchFn;
  const hasAsync = !!(cfg.filterAsync ?? cfg.sortAsync);

  // ── Mutable state ───────────────────────────────────────────────────────────
  let rawData: readonly T[] = cfg.initialData ?? data;
  let filterFn: ((item: T, index: number, arr: readonly T[]) => boolean) | undefined = cfg.filter;
  let sortFn: Sorter<T> | undefined = cfg.sort;
  let query = '';
  let limit = Math.max(1, Math.trunc(cfg.limit ?? 20));
  let page = 1;
  let view: readonly T[] = [];
  let isLoading = false;
  let error: SourceError | null = null;
  let asyncAbort: AbortController | null = null;

  // ── Cached accessors ────────────────────────────────────────────────────────
  let cachedCurrent: readonly T[] = [];
  let cachedMeta: SourceMeta = createMeta({
    error: null,
    isLoading: false,
    isSearchPending: false,
    pageNumber: 1,
    pageSize: limit,
    totalItems: 0,
  });

  const refreshCache = () => {
    if (!view.length) {
      cachedCurrent = [];
    } else {
      const start = (page - 1) * limit;

      cachedCurrent = view.slice(start, start + limit);
    }

    cachedMeta = createMeta({
      error,
      isLoading,
      isSearchPending: core.isScheduled,
      pageNumber: page,
      pageSize: limit,
      totalItems: view.length,
    });
  };

  const commit = () => {
    refreshCache();
    core.notify();
  };

  // ── Sync recompute ──────────────────────────────────────────────────────────
  const recomputeSync = (): void => {
    try {
      let next: readonly T[] = query ? searchFn(rawData, query) : rawData;

      if (filterFn) next = next.filter(filterFn);

      if (sortFn) next = [...next].sort(sortFn);

      page = clampPage(page, pageCount(next.length, limit));
      view = next;
      error = null;
    } catch (e: unknown) {
      error = new SourceError(extractError(e), { cause: e });
      view = [];
    }
  };

  // ── Async recompute ─────────────────────────────────────────────────────────
  const recomputeAsync = async (): Promise<void> => {
    if (asyncAbort) asyncAbort.abort();

    asyncAbort = new AbortController();

    const sig = asyncAbort.signal;

    let next: readonly T[] = query ? searchFn(rawData, query) : rawData;

    if (filterFn) next = next.filter(filterFn);

    if (sortFn) next = [...next].sort(sortFn);

    isLoading = true;
    error = null;
    refreshCache();
    core.notify();

    try {
      if (cfg.filterAsync) next = await cfg.filterAsync(next, sig);

      if (sig.aborted) return;

      if (cfg.sortAsync) next = await cfg.sortAsync(next, sig);

      if (sig.aborted) return;
    } catch (e: unknown) {
      if (sig.aborted) return;

      error = new SourceError(extractError(e), { cause: e });
      isLoading = false;
      asyncAbort = null;
      view = [];
      commit();

      return;
    }

    page = clampPage(page, pageCount(next.length, limit));
    view = next;
    isLoading = false;
    asyncAbort = null;
    commit();
  };

  // ── Unified emit ────────────────────────────────────────────────────────────
  const emit = (): Promise<void> => {
    if (hasAsync) {
      return recomputeAsync();
    }

    recomputeSync();
    commit();

    return Promise.resolve();
  };

  // ── Initial compute ─────────────────────────────────────────────────────────
  recomputeSync();
  refreshCache();

  // ── Public API ──────────────────────────────────────────────────────────────
  return {
    get current() {
      return cachedCurrent;
    },

    dispose() {
      if (asyncAbort) {
        asyncAbort.abort();
        asyncAbort = null;
      }

      core.dispose();
    },

    flush() {
      return core.flush(() => emit());
    },

    goTo(target) {
      const pages = pageCount(view.length, limit);
      const clamped = clampPage(target, pages);

      if (clamped === page) return Promise.resolve();

      page = clamped;
      commit();

      return Promise.resolve();
    },

    goToLast() {
      const last = pageCount(view.length, limit);

      if (page === last) return Promise.resolve();

      page = last;
      commit();

      return Promise.resolve();
    },

    get meta() {
      return cachedMeta;
    },

    next() {
      const pages = pageCount(view.length, limit);

      if (page >= pages) return Promise.resolve();

      page++;
      commit();

      return Promise.resolve();
    },

    prev() {
      if (page <= 1) return Promise.resolve();

      page--;
      commit();

      return Promise.resolve();
    },

    ready(timeout) {
      return core.ready(() => !isLoading && !core.isScheduled, timeout);
    },

    reset() {
      core.cancelTimer();
      query = '';
      page = 1;
      filterFn = cfg.filter;
      sortFn = cfg.sort;

      return emit();
    },

    restoreQuery(patch) {
      let changed = false;

      if (patch.limit !== undefined) {
        const n = Math.max(1, Math.trunc(patch.limit));

        if (n !== limit) {
          limit = n;
          changed = true;
        }
      }

      if ('search' in patch) {
        const s = patch.search ?? '';

        if (s !== query) {
          query = s;
          changed = true;
        }
      }

      if ('filter' in patch && patch.filter !== filterFn) {
        filterFn = patch.filter;
        page = 1;
        changed = true;
      }

      if ('sort' in patch && patch.sort !== sortFn) {
        sortFn = patch.sort as Sorter<T> | undefined;
        page = 1;
        changed = true;
      }

      if (patch.page !== undefined) {
        const p = clampPage(patch.page, pageCount(view.length, limit));

        if (p !== page) {
          page = p;
          changed = true;
        }
      }

      if (!changed) return Promise.resolve();

      return emit();
    },

    search(q) {
      if (q === query) return;

      query = q;
      page = 1;
      core.schedule(() => {
        void emit();
      }, debounceMs);
      commit();
    },

    searchNow(q) {
      if (q === query) return Promise.resolve();

      core.cancelTimer();
      query = q;
      page = 1;

      return emit();
    },

    setData(d) {
      rawData = d;

      return emit();
    },

    setFilter(f) {
      if (f === filterFn) return Promise.resolve();

      filterFn = f;
      page = 1;

      return emit();
    },

    setLimit(n) {
      const next = Math.max(1, Math.trunc(n));

      if (next === limit) return Promise.resolve();

      limit = next;
      page = 1;

      return emit();
    },

    setSort(s) {
      if (s === sortFn) return Promise.resolve();

      sortFn = s;
      page = 1;

      return emit();
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    [Symbol.dispose]() {
      this.dispose();
    },

    toQuery(): SourceQuery {
      return { ...(query && { search: query }), limit, page };
    },
  };
}
