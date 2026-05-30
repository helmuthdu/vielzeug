import type { InfiniteConfig, InfiniteMeta, InfiniteSource, InfiniteSourceQuery } from './types';

import { createSourceCore } from './core';
import { defaultRetryDelay, extractError, retry } from './utils';

const DEFAULTS = { debounceMs: 300, limit: 10 } as const;

/**
 * Creates an append-mode (infinite scroll) data source.
 * Each `loadMore()` call fetches the next page and appends results to `current`.
 * Searching resets accumulated results and restarts from the first page.
 */
export function createInfiniteSource<T>(cfg: InfiniteConfig<T>): InfiniteSource<T> {
  const core = createSourceCore();
  const limitDefault = Math.max(1, cfg.limit ?? DEFAULTS.limit);
  const debounceMs = cfg.debounceMs ?? DEFAULTS.debounceMs;
  const autoFetch = cfg.autoFetch ?? true;
  const retryAttempts = cfg.retry?.attempts ?? 0;
  const retryDelay = cfg.retry?.delay ?? defaultRetryDelay;
  const refreshIntervalMs = cfg.refreshInterval ?? 0;

  let limit = limitDefault;
  let search = '';
  let page = 1;

  let accumulated: readonly T[] = [];
  let total = 0;
  let error: string | null = null;
  let cachedMeta!: InfiniteMeta;
  let isLoading = false;

  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  // Single in-flight controller — new fetches abort the previous one.
  let currentController: AbortController | null = null;

  const refreshMeta = () => {
    cachedMeta = {
      errorMessage: error,
      hasMore: accumulated.length < total,
      isLoading,
      isSearchPending: core.isScheduled,
      pageSize: limit,
      totalItems: total,
    };
  };

  const notify = () => {
    refreshMeta();
    core.notify();
  };

  const fetchPage = async (targetPage: number, append: boolean): Promise<void> => {
    if (currentController) currentController.abort();

    const controller = new AbortController();

    currentController = controller;
    isLoading = true;
    error = null;
    notify();

    const startTime = Date.now();
    const q: InfiniteSourceQuery = { limit, page: targetPage, search: search || undefined };

    try {
      const result = await retry(
        (signal) => cfg.fetch({ limit, page: targetPage, search: search || undefined }, signal),
        {
          delay: retryDelay,
          signal: controller.signal,
          times: retryAttempts + 1,
        },
      );

      if (controller.signal.aborted) return;

      total = result.total ?? 0;
      accumulated = append ? [...accumulated, ...result.items] : result.items;
      page = targetPage;
      error = null;
      cfg.onFetch?.({ durationMs: Date.now() - startTime, query: q, status: 'success' });
    } catch (reason: unknown) {
      if (controller.signal.aborted) return;

      error = extractError(reason);
      cfg.onFetch?.({ durationMs: Date.now() - startTime, error: error, query: q, status: 'error' });
    } finally {
      if (!controller.signal.aborted) {
        currentController = null;
        isLoading = false;
        notify();
      }
    }
  };

  const doInitialFetch = () => fetchPage(1, false);

  refreshMeta();

  if (autoFetch) {
    void doInitialFetch();
  }

  if (refreshIntervalMs > 0) {
    refreshTimer = setInterval(() => {
      void doInitialFetch();
    }, refreshIntervalMs);
  }

  return {
    get current() {
      return accumulated;
    },

    dispose() {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = undefined;
      }

      if (currentController) {
        currentController.abort();
        currentController = null;
      }

      core.dispose();
    },

    flush(): Promise<void> {
      return core.flush(() => doInitialFetch());
    },

    loadMore(): Promise<void> {
      if (accumulated.length >= total) return Promise.resolve();

      return fetchPage(page + 1, true);
    },

    get meta() {
      return cachedMeta;
    },

    ready(): Promise<void> {
      return core.ready(() => !isLoading && !core.isScheduled);
    },

    reset(): Promise<void> {
      limit = limitDefault;
      search = '';
      page = 1;
      accumulated = [];
      total = 0;

      return doInitialFetch();
    },

    search(q: string) {
      search = q;
      page = 1;
      accumulated = [];
      core.schedule(() => {
        void doInitialFetch();
      }, debounceMs);
      notify();
    },

    searchNow(q: string): Promise<void> {
      core.cancelTimer();
      search = q;
      page = 1;
      accumulated = [];

      return doInitialFetch();
    },

    setLimit(n: number): Promise<void> {
      limit = Math.max(1, Math.trunc(n));
      page = 1;
      accumulated = [];

      return doInitialFetch();
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    toQuery(): InfiniteSourceQuery {
      return { limit, page, search: search || undefined };
    },
  };
}
