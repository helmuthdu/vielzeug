import type { RetryOptions } from './retry';
import type { QueryKey, QueryState, SyncStore, Unsubscribe } from './types';

import {
  buildCacheContext,
  ensureEntry,
  evictEntry,
  hashAtom,
  hashKey,
  isKeyOrPrefix,
  makeFetchConfig,
  resolveValue,
  scheduleGc,
  startFetch,
  type CacheContext,
  type CacheEntry,
  type FetchConfig,
  type QueryFn,
  type QueryFnContext,
} from './query-cache';
import { notify, toBaseState, watchInternal } from './query-observe';

export type { QueryFn, QueryFnContext };

/**
 * Options for `qc.fetch()`. Always throws on error and returns `T`.
 * Use `observe()` for reactive subscriptions with select/placeholder support.
 */
export type QueryOptions<T> = {
  /**
   * When `false` the fetch is skipped and the current cached value is returned.
   * If no cached data exists yet, the return value is `undefined` — use `getState()`
   * to inspect entry status in that case.
   * Defaults to `true`.
   */
  enabled?: boolean;
  fn: QueryFn<T>;
  gcTime?: number;
  /** Pre-seed the cache as a successful entry when no data exists. Subject to normal staleTime checks. */
  initialData?: T | (() => T | undefined);
  key: QueryKey;
  staleTime?: number;
} & RetryOptions;

/**
 * Shared reactive fields for `observe()`.
 */
type ObserveExtras<T, S> = {
  /**
   * Temporary value shown while a fetch is in-flight and no cached data exists.
   * Does not affect cache state — only the value returned by `store.peek()`.
   */
  placeholderData?: S | (() => S | undefined);
  /** Transform the cached data before it is delivered to store subscribers. */
  select?: (data: T | undefined) => S | undefined;
};

/**
 * Options for `qc.observe()`. Two forms:
 *
 * - `fetch?: true` (default) — triggers a background fetch; `fn` is required.
 * - `fetch: false` — read-only store; `fn` is not required or called.
 *
 * Errors surface via `store.peek().status === 'error'`, not via Promise rejection.
 */
export type ObserveOptions<T, S = T> =
  | ({ fetch?: true } & QueryOptions<T> & ObserveExtras<T, S>)
  | ({ fetch: false; key: QueryKey } & Partial<QueryOptions<T>> & ObserveExtras<T, S>);

export type QueryClientOptions = {
  /**
   * Optional fetch implementation injected by `createCourier` so that
   * query fetches flow through the shared interceptor pipeline (auth, logging, etc.).
   * When omitted `globalThis.fetch` is used directly.
   */
  fetch?: typeof globalThis.fetch;
  gcTime?: number;
  staleTime?: number;
} & RetryOptions;

export function createQuery(opts?: QueryClientOptions) {
  let disposed = false;
  const disposeController = new AbortController();
  const entries = new Map<string, CacheEntry>();
  const gcTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const ctx: CacheContext = buildCacheContext(
    {
      delay: opts?.delay,
      gcTime: opts?.gcTime,
      shouldRetry: opts?.shouldRetry,
      staleTime: opts?.staleTime,
      times: opts?.times,
    },
    entries,
    gcTimers,
    notify,
  );

  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T> {
    if (disposed) throw new Error('[courier] QueryClient has been disposed');

    const { enabled = true, fn, gcTime, initialData, key, staleTime, ...retryOpts } = options;

    // When disabled and no existing entry, return undefined without creating a cache entry.
    if (!enabled) {
      const h = hashKey(key);
      const existing = entries.get(h);

      return (existing?.data as T | undefined) ?? (undefined as unknown as T);
    }

    const entry = ensureEntry<T>(ctx, key);
    const config = makeFetchConfig<T>(ctx, { fn, gcTime, staleTime, ...retryOpts });

    if (initialData !== undefined && entry.status === 'loading' && entry.data === undefined) {
      const initVal = resolveValue(initialData);

      if (initVal !== undefined) {
        entry.data = initVal;
        entry.error = null;
        entry.status = 'success';
        entry.updatedAt = Date.now();
      }
    }

    if (
      entry.status === 'success' &&
      entry.updatedAt !== undefined &&
      Date.now() - entry.updatedAt < config.staleTime &&
      !entry.isFetching
    ) {
      entry.lastConfig = config;

      return entry.data as T;
    }

    entry.lastConfig = config;

    if (entry.inflight) return entry.inflight.promise;

    return startFetch(ctx, entry, config);
  }

  function revalidateObservedEntry<T>(entry: CacheEntry<T>): void {
    if (!entry.lastConfig) {
      evictEntry(ctx, entry);

      return;
    }

    if (entry.isFetching) return;

    startFetch(ctx, entry, entry.lastConfig as FetchConfig<T>).catch(() => {});
  }

  function invalidate(key: QueryKey): void {
    const prefixHash = key.map((k) => hashAtom(k));

    for (const entry of [...entries.values()]) {
      if (isKeyOrPrefix(entry, prefixHash)) {
        if (entry.observers.size > 0) {
          revalidateObservedEntry(entry);
          continue;
        }

        evictEntry(ctx, entry);
      }
    }
  }

  function set<T>(key: QueryKey, data: T, opts?: { gcTime?: number; updatedAt?: number }): void;
  function set<T>(
    key: QueryKey,
    updater: (old: T | undefined) => T,
    opts?: { gcTime?: number; updatedAt?: number },
  ): void;
  function set<T>(
    key: QueryKey,
    dataOrUpdater: T | ((old: T | undefined) => T),
    opts?: { gcTime?: number; updatedAt?: number },
  ): void {
    const entry = ensureEntry<T>(ctx, key);
    const gcTime = opts?.gcTime ?? entry.lastConfig?.gcTime ?? ctx.gcTimeDefault;

    entry.data =
      typeof dataOrUpdater === 'function' ? (dataOrUpdater as (old: T | undefined) => T)(entry.data) : dataOrUpdater;
    entry.error = null;
    entry.status = 'success';
    entry.updatedAt = opts?.updatedAt ?? Date.now();
    entry.isFetching = false;
    entry.inflight = null;
    notify(entry);
    scheduleGc(ctx, entry, gcTime);
  }

  function isStaleAndRevalidatable(entry: CacheEntry): boolean {
    if (entry.observers.size === 0 || !entry.lastConfig || entry.isFetching) return false;

    if (entry.status === 'success' && entry.updatedAt !== undefined) {
      return Date.now() - entry.updatedAt >= entry.lastConfig.staleTime;
    }

    if (entry.status === 'error' && entry.data !== undefined && entry.updatedAt !== undefined) {
      return Date.now() - entry.updatedAt >= entry.lastConfig.staleTime;
    }

    return false;
  }

  /**
   * Returns a `SyncStore` for `key` and optionally triggers a background fetch.
   *
   * **With fetch (default):** pass `fn` and the store triggers a background fetch on creation.
   * Errors surface via `store.peek().status === 'error'`, not via Promise rejection.
   *
   * **Without fetch:** pass `fetch: false` — `fn` is not required. The store reflects
   * whatever is in the cache. Useful when another path is responsible for populating the entry.
   *
   * @example
   * ```ts
   * // Fetch form
   * const store = qc.observe({ key: ['users', 1], fn: ({ signal }) => fetchUser(1, signal) });
   *
   * // Read-only form — no fn required
   * const store = qc.observe({ key: ['users', 1], fetch: false });
   * ```
   */
  function observe<T = unknown, S = T>(options: ObserveOptions<T, S>): SyncStore<QueryState<S>> {
    const {
      fetch: shouldFetch = true,
      key,
      placeholderData,
      select,
    } = options as {
      fetch?: boolean;
      key: QueryKey;
      placeholderData?: S | (() => S | undefined);
      select?: (data: T | undefined) => S | undefined;
    };

    const store = watchInternal<T, S>(ctx, key, { placeholderData, select });

    if (shouldFetch && (options as { fn?: QueryFn<T> }).fn) {
      fetchQuery({ ...(options as QueryOptions<T>) }).catch(() => {});
    }

    return store;
  }

  return {
    cancel(key: QueryKey): void {
      const entry = entries.get(hashKey(key));

      if (!entry?.inflight) return;

      entry.inflight.controller.abort();
    },

    cancelAll(): void {
      for (const entry of entries.values()) {
        entry.inflight?.controller.abort();
      }
    },

    clear(): void {
      for (const entry of [...entries.values()]) {
        evictEntry(ctx, entry);
      }
    },

    get disposalSignal(): AbortSignal {
      return disposeController.signal;
    },

    dispose(): void {
      if (disposed) return;

      disposed = true;
      ctx.disposed = true;
      disposeController.abort();

      for (const [, entry] of entries) {
        entry.observers.clear();
        entry.inflight?.controller.abort();
      }

      for (const [, timer] of gcTimers) {
        clearTimeout(timer);
      }

      gcTimers.clear();
      entries.clear();
    },

    get disposed(): boolean {
      return disposed;
    },

    fetch: fetchQuery,

    fetchMany<T = unknown>(queries: QueryOptions<T>[]): Promise<T[]> {
      return Promise.all(queries.map((q) => fetchQuery(q)));
    },

    get<T>(key: QueryKey): T | undefined {
      const entry = entries.get(hashKey(key));

      return entry ? (entry.data as T | undefined) : undefined;
    },

    getState<T>(key: QueryKey): QueryState<T> | null {
      const entry = entries.get(hashKey(key)) as CacheEntry<T> | undefined;

      if (!entry) return null;

      return toBaseState(entry);
    },

    invalidate,

    keys(): QueryKey[] {
      return [...entries.values()].map((e) => e.key);
    },

    observe,

    observeMany<T = unknown>(keys: QueryKey[]): SyncStore<QueryState<T>[]> {
      const stores = keys.map((k) => watchInternal<T>(ctx, k));

      return {
        peek(): QueryState<T>[] {
          return stores.map((s) => s.peek());
        },

        subscribe(onStoreChange: () => void): Unsubscribe {
          const unsubs = stores.map((s) => s.subscribe(onStoreChange));

          return () => {
            for (const u of unsubs) u();
          };
        },
      };
    },

    refetchStale(): void {
      for (const entry of [...entries.values()]) {
        if (isStaleAndRevalidatable(entry)) {
          startFetch(ctx, entry, entry.lastConfig as FetchConfig<unknown>).catch(() => {});
        }
      }
    },

    remove(key: QueryKey): void {
      const entry = entries.get(hashKey(key));

      if (entry) evictEntry(ctx, entry);
    },

    set,

    get size(): number {
      return entries.size;
    },

    [Symbol.dispose](): void {
      this.dispose();
    },
  };
}

export type QueryClient = ReturnType<typeof createQuery>;
