import type { LocalSource, LocalSourceConfig, LocalSourceQuery, SearchOptions, SourceQuery } from './types';

import { createSourceCore } from './core';
import { clampPage, createMeta, pageCount } from './pagination';

type PendingSearch = { promise: Promise<void>; resolve: () => void };

const DEFAULT_LIMIT = 20;
const DEFAULT_DEBOUNCE_MS = 300;

function defaultSearch<T>(items: readonly T[], query: string): readonly T[] {
  const q = query.toLowerCase();

  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
}

/**
 * Creates an in-memory paginated source with optional async filter/sort pipelines.
 *
 * When neither `filterAsync` nor `sortAsync` are configured, all operations
 * complete synchronously — there is no loading state and `ready()` resolves immediately.
 * Provide async ops to offload heavy computation (e.g. to a Web Worker).
 *
 * @example
 * ```ts
 * // Synchronous (common case)
 * const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });
 * await source.goTo(2);
 * console.log(source.current); // [3, 4]
 *
 * // Async pipeline (Web Worker offloading)
 * const source = createLocalSource(users, {
 *   filterAsync: (items, signal) => myWorker.filter(items, signal),
 *   sortAsync: (items, signal) => myWorker.sort(items, signal),
 * });
 * ```
 */
export function createLocalSource<T>(data: readonly T[], cfg: LocalSourceConfig<T> = {}): LocalSource<T> {
  const core = createSourceCore();
  const isAsync = cfg.filterAsync !== undefined || cfg.sortAsync !== undefined;
  const debounceMs = cfg.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  let allData: readonly T[] = cfg.initialData ?? data;
  let search = '';
  let filter = cfg.filter;
  let sort = cfg.sort;
  let limit = cfg.limit ?? DEFAULT_LIMIT;
  let page = 1;
  let processed: readonly T[] = [];
  let isLoading = false;
  let isSearchPending = false;
  let asyncController: AbortController | null = null;
  let pendingSearch: PendingSearch | null = null;

  const commit = () => core.notify();

  const resolvePendingSearch = () => {
    if (pendingSearch) {
      pendingSearch.resolve();
      pendingSearch = null;
    }
  };

  // ── Sync pipeline (used when no async ops) ──────────────────────────────────
  const runSyncPipeline = (): readonly T[] => {
    let result: readonly T[] = allData;

    if (search) result = (cfg.searchFn ?? defaultSearch)(result, search);

    if (filter) result = result.filter(filter);

    if (sort) result = [...result].sort(sort);

    return result;
  };

  const recompute = () => {
    processed = runSyncPipeline();

    const pages = pageCount(processed.length, limit);

    page = clampPage(page, pages);
  };

  // ── Async pipeline ──────────────────────────────────────────────────────────
  const runAsyncPipeline = async (): Promise<void> => {
    asyncController?.abort();

    const controller = new AbortController();

    asyncController = controller;
    isLoading = true;
    commit();

    try {
      let result: readonly T[] = allData;

      if (search) result = (cfg.searchFn ?? defaultSearch)(result, search);

      if (filter) result = result.filter(filter);

      if (cfg.filterAsync && !controller.signal.aborted) {
        result = await cfg.filterAsync(result, controller.signal);
      }

      if (sort) result = [...result].sort(sort);

      if (cfg.sortAsync && !controller.signal.aborted) {
        result = await cfg.sortAsync(result, controller.signal);
      }

      if (controller.signal.aborted) return;

      processed = result;
      isLoading = false;
      isSearchPending = false;

      const pages = pageCount(processed.length, limit);

      page = clampPage(page, pages);
    } catch {
      if (!controller.signal.aborted) {
        isLoading = false;
        isSearchPending = false;
      }
    } finally {
      if (asyncController === controller) asyncController = null;
    }

    commit();
    resolvePendingSearch();
  };

  // Internal flush — not part of public API
  const flushInternal = (): Promise<void> => {
    if (isAsync) return runAsyncPipeline();

    isSearchPending = false;
    recompute();
    commit();
    resolvePendingSearch();

    return Promise.resolve();
  };

  // ── Initial state ───────────────────────────────────────────────────────────
  if (isAsync) {
    // Async: run initial sync pass (no async ops involved yet)
    processed = runSyncPipeline();
  } else {
    recompute();
  }

  return {
    get current() {
      const start = (page - 1) * limit;

      return processed.slice(start, start + limit);
    },

    get disposalSignal() {
      return core.disposalSignal;
    },

    dispose() {
      if (core.isDisposed) return;

      core.cancelTimer();
      asyncController?.abort();
      asyncController = null;
      resolvePendingSearch();
      core.dispose();
    },

    get disposed() {
      return core.isDisposed;
    },

    goTo(n) {
      const pages = pageCount(processed.length, limit);
      const clamped = clampPage(n, pages);

      if (clamped === page) return Promise.resolve();

      page = clamped;
      commit();

      return Promise.resolve();
    },

    goToLast() {
      return this.goTo(pageCount(processed.length, limit));
    },

    get meta() {
      return createMeta({
        error: null,
        isLoading,
        isSearchPending,
        pageNumber: page,
        pageSize: limit,
        totalItems: processed.length,
      });
    },

    next() {
      return this.goTo(page + 1);
    },

    patch(changes: LocalSourceQuery<T>) {
      let changed = false;

      if (changes.limit !== undefined) {
        const next = Math.max(1, Math.trunc(changes.limit));

        if (next !== limit) {
          limit = next;
          changed = true;
        }
      }

      if ('filter' in changes) {
        filter = changes.filter;
        changed = true;
      }

      if ('sort' in changes) {
        sort = changes.sort;
        changed = true;
      }

      if ('search' in changes && changes.search !== search) {
        search = changes.search ?? '';
        changed = true;
      }

      if (changes.page !== undefined) {
        const next = clampPage(changes.page, pageCount(processed.length, limit));

        if (next !== page) {
          page = next;
          changed = true;
        }
      }

      if (!changed) return Promise.resolve();

      // Reset page only when non-page query fields changed without an explicit page
      if (
        (changes.limit !== undefined || 'filter' in changes || 'sort' in changes || 'search' in changes) &&
        changes.page === undefined
      ) {
        page = 1;
      }

      return flushInternal();
    },

    prev() {
      return this.goTo(page - 1);
    },

    ready(timeout?: number) {
      return core.ready(() => !isLoading && !core.isScheduled, timeout);
    },

    reset() {
      core.cancelTimer();
      isSearchPending = false;
      search = '';
      filter = cfg.filter;
      sort = cfg.sort;
      page = 1;
      resolvePendingSearch();

      return flushInternal();
    },

    search(q, opts?: SearchOptions): Promise<void> {
      if (opts?.immediate) {
        if (q === search) return Promise.resolve();

        core.cancelTimer();
        isSearchPending = false;
        search = q;
        page = 1;
        resolvePendingSearch();

        return flushInternal();
      }

      if (q === search) return Promise.resolve();

      // Cancel any previous pending search promise
      resolvePendingSearch();

      search = q;
      page = 1;
      isSearchPending = true;
      commit();

      let resolveSearch!: () => void;
      const promise = new Promise<void>((res) => {
        resolveSearch = res;
      });

      pendingSearch = { promise, resolve: resolveSearch };

      core.schedule(() => {
        isSearchPending = false;
        void flushInternal();
      }, debounceMs);

      return promise;
    },

    setData(d) {
      allData = d;
      page = 1;

      return flushInternal();
    },

    setFilter(f) {
      if (f === filter) return Promise.resolve();

      filter = f;
      page = 1;

      return flushInternal();
    },

    setLimit(n) {
      const next = Math.max(1, Math.trunc(n));

      if (next === limit) return Promise.resolve();

      limit = next;
      page = 1;

      return flushInternal();
    },

    setSort(s) {
      if (s === sort) return Promise.resolve();

      sort = s;
      page = 1;

      return flushInternal();
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    [Symbol.dispose]() {
      this.dispose();
    },

    toQuery(): SourceQuery {
      return {
        limit,
        page,
        ...(search && { search }),
      };
    },
  };
}
