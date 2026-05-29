import type { InfiniteConfig, InfiniteMeta, InfiniteSource } from './types';

const DEFAULTS = { debounceMs: 300, limit: 10 } as const;

/**
 * Creates an append-mode (infinite scroll) data source.
 * Each `loadMore()` call fetches the next page and appends results to `all`.
 * Searching resets accumulated results and restarts from the first page.
 *
 * @example
 * ```ts
 * const source = createInfiniteSource({
 *   fetch: async ({ page, limit }, signal) => {
 *     const res = await fetch(`/api/items?page=${page}&limit=${limit}`, { signal });
 *     const { items, total } = await res.json();
 *     return { items, total };
 *   },
 * });
 *
 * await source.ready();
 * console.log(source.all, source.meta.hasMore);
 *
 * await source.loadMore();
 * console.log(source.all.length); // first + second page
 * ```
 */
export function createInfiniteSource<T>(cfg: InfiniteConfig<T>): InfiniteSource<T> {
  const listeners = new Set<() => void>();
  const limitDefault = Math.max(1, cfg.limit ?? DEFAULTS.limit);
  const debounceMs = cfg.debounceMs ?? DEFAULTS.debounceMs;
  const autoFetch = cfg.autoFetch ?? true;

  let limit = limitDefault;
  let search = '';
  let page = 1;

  let accumulated: readonly T[] = [];
  let total = 0;
  let error: string | null = null;
  let cachedMeta!: InfiniteMeta;
  let isLoading = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  // AbortController for the current fetch.
  let currentController: AbortController | null = null;

  const refreshMeta = () => {
    cachedMeta = {
      errorMessage: error,
      hasMore: accumulated.length < total,
      isLoading,
      isSearchPending: timer !== undefined,
      pageSize: limit,
      totalItems: total,
    };
  };

  const notify = () => {
    refreshMeta();

    for (const listener of listeners) {
      listener();
    }
  };

  const fetchPage = async (targetPage: number, append: boolean): Promise<void> => {
    // Abort any previous in-flight request.
    if (currentController) {
      currentController.abort();
    }

    const controller = new AbortController();

    currentController = controller;
    isLoading = true;
    error = null;
    notify();

    try {
      const result = await cfg.fetch({ limit, page: targetPage, search: search || undefined }, controller.signal);

      if (controller.signal.aborted) return;

      total = result.total ?? 0;
      accumulated = append ? [...accumulated, ...result.items] : result.items;
      page = targetPage;
      error = null;
    } catch (reason: unknown) {
      if (controller.signal.aborted) return;

      error = (reason as { message?: string })?.message ?? 'Request failed';
    } finally {
      if (!controller.signal.aborted) {
        currentController = null;
        isLoading = false;
        notify();
      }
    }
  };

  const doInitialFetch = () => fetchPage(1, false);

  const debounced = () => {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      timer = undefined;
      void doInitialFetch();
    }, debounceMs);

    notify();
  };

  refreshMeta();

  if (autoFetch) {
    void doInitialFetch();
  }

  return {
    get all() {
      return accumulated;
    },

    loadMore(): Promise<void> {
      if (accumulated.length >= total) return Promise.resolve();

      return fetchPage(page + 1, true);
    },

    get meta() {
      return cachedMeta;
    },

    ready(): Promise<void> {
      if (!isLoading && !timer) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const checkReady = () => {
          if (!isLoading && !timer) {
            listeners.delete(checkReady);
            resolve();
          }
        };

        listeners.add(checkReady);
      });
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
      debounced();
    },

    searchNow(q: string): Promise<void> {
      search = q;
      page = 1;
      accumulated = [];

      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }

      return doInitialFetch();
    },

    setLimit(n: number): Promise<void> {
      limit = Math.max(1, Math.trunc(n));
      page = 1;
      accumulated = [];

      return doInitialFetch();
    },

    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}
