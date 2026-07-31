import type { ApiClient } from './api';
import type { ResponseType } from './response';
import type { RetryOptions } from './retry';
import type { QueryKey, QueryState, SyncStore, Unsubscribe } from './types';
import type { Params } from './url';

import { CourierDisposedError, CourierError } from './errors';
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
 * Where a query's data comes from. Two flat option shapes (a union — NOT an
 * intersection — so contextual typing of literals keeps working):
 * - `fn` — a fully caller-authored fetcher (escape hatch; does not flow through
 *   the api client's interceptor pipeline).
 * - `url` — a request descriptor routed through the api client passed to
 *   `createQuery({ api })`: baseUrl, headers, interceptors, timeout, and error
 *   classification all apply. The 90% case.
 */
export type QuerySource<T> =
  | {
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
      initialData?: NoInfer<T> | (() => NoInfer<T> | undefined);
      key: QueryKey;
      staleTime?: number;
    }
  | {
      enabled?: boolean;
      gcTime?: number;
      initialData?: NoInfer<T> | (() => NoInfer<T> | undefined);
      key: QueryKey;
      params?: Params;
      responseType?: ResponseType;
      staleTime?: number;
      url: string;
    };

/** The source fields alone (what's left after the base query options are destructured out). */
type QuerySourceCore<T> = { fn: QueryFn<T> } | { params?: Params; responseType?: ResponseType; url: string };

/** Resolve a query source to a fetcher. `url` sources require an api client. */
function resolveQueryFn<T>(source: QuerySourceCore<T>, api: ApiClient | undefined): QueryFn<T> {
  if ('fn' in source) return source.fn;

  if (!api) {
    throw new CourierError(
      `query source { url: '${source.url}' } requires an api client — pass one via createQuery({ api }) (createCourier does this automatically).`,
    );
  }

  const { params, responseType, url } = source;

  // `url` is a runtime string here, so api's path-param inference can't see
  // the placeholders — bypass the typed-params path deliberately.
  return ({ signal }) => api.get<T>(url, { params, responseType, signal } as never);
}

/**
 * Options for `qc.fetch()`. Always throws on error and returns `T` (or `undefined`
 * when `enabled: false` and no cached data exists).
 * Use `observe()` for reactive subscriptions with select/placeholder support.
 */
export type QueryOptions<T> = QuerySource<T> & RetryOptions;

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
 * - `fetch?: true` (default) — triggers a background fetch via `fn` or `url`
 *   (exactly one required; the union rejects passing both).
 * - `fetch: false` — read-only store; a passed `fn` or `url` is ignored, never called.
 *
 * Errors surface via `store.peek().status === 'error'`, not via Promise rejection.
 */
export type ObserveOptions<T, S = T> =
  | ({ fetch?: true } & QueryOptions<T> & ObserveExtras<T, S>)
  // `fn`/`url` (and their companions) are accepted (and ignored) so the same options
  // object can toggle `fetch` without forking its shape — never called when `fetch: false`.
  | ({
      fetch: false;
      fn?: QueryFn<T>;
      key: QueryKey;
      params?: Params;
      responseType?: ResponseType;
      url?: string;
    } & ObserveExtras<T, S>);

export type QueryClientOptions = {
  /**
   * Api client used to fulfill `url`-sourced queries. `createCourier()` passes its
   * own automatically, so `courier.query` fetches flow through the same transport
   * (interceptors, headers, baseUrl) as `courier.api` requests.
   */
  api?: ApiClient;
  gcTime?: number;
  staleTime?: number;
} & RetryOptions;

/**
 * Creates a key-based query cache with request deduplication, retries, stale-time/gc-time
 * eviction, and `observe()`-based reactive subscriptions (`SyncStore`-compatible).
 *
 * @example
 * ```ts
 * const qc = createQuery({ staleTime: 30_000 });
 *
 * // One-shot fetch, always resolves or throws
 * const user = await qc.fetch({ key: ['users', 1], fn: ({ signal }) => fetchUser(1, signal) });
 *
 * // Reactive subscription — errors surface via store.peek().status, not rejection
 * const store = qc.observe({ key: ['users', 1], fn: ({ signal }) => fetchUser(1, signal) });
 * const unsub = store.subscribe(() => console.log(store.peek()));
 *
 * // later:
 * qc.dispose();
 * ```
 */
export function createQuery(opts?: QueryClientOptions) {
  let disposed = false;
  const disposeController = new AbortController();
  const entries = new Map<string, CacheEntry>();
  const api = opts?.api;

  const ctx: CacheContext = buildCacheContext(
    {
      delay: opts?.delay,
      gcTime: opts?.gcTime,
      shouldRetry: opts?.shouldRetry,
      staleTime: opts?.staleTime,
      times: opts?.times,
    },
    entries,
    notify,
  );

  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T | undefined> {
    if (disposed) throw new CourierDisposedError('QueryClient');

    const { delay, enabled = true, gcTime, initialData, key, shouldRetry, staleTime, times, ...source } = options;

    // When disabled the fetch is skipped and cached data is returned. `initialData`
    // is a seed, not a fetch — it is honored even when disabled (seeding an entry if
    // none exists yet, so observers see it), unlike a skipped network call.
    if (!enabled) {
      const h = hashKey(key);

      if (initialData !== undefined) {
        const entry = ensureEntry<T>(ctx, key);

        if (entry.status === 'loading' && entry.data === undefined) {
          const initVal = resolveValue(initialData);

          if (initVal !== undefined) {
            entry.data = initVal;
            entry.error = null;
            entry.status = 'success';
            entry.updatedAt = Date.now();
            notify(entry);
            // Seeded entries age out like any other — skipping this made
            // disabled+seeded entries immortal.
            scheduleGc(ctx, entry, gcTime ?? ctx.gcTimeDefault);
          }
        }

        return entry.data as T | undefined;
      }

      return entries.get(h)?.data as T | undefined;
    }

    const fn = resolveQueryFn(source, api);

    const entry = ensureEntry<T>(ctx, key);
    const config = makeFetchConfig<T>(ctx, { delay, fn, gcTime, shouldRetry, staleTime, times });

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

    if (shouldFetch && ('fn' in options || 'url' in options)) {
      fetchQuery({ ...(options as QueryOptions<T>) }).catch(() => {});
    }

    return store;
  }

  const fetchMany: {
    <T = unknown>(queries: QueryOptions<T>[]): Promise<(T | undefined)[]>;
    <T = unknown>(
      queries: QueryOptions<T>[],
      options: { settled: true },
    ): Promise<PromiseSettledResult<T | undefined>[]>;
  } = <T>(queries: QueryOptions<T>[], options?: { settled?: boolean }) => {
    // Default rejects wholesale on the first failure; `settled: true` returns
    // per-query outcomes instead (react-query's useQueries shape).
    if (options?.settled) return Promise.allSettled(queries.map((q) => fetchQuery(q)));

    return Promise.all(queries.map((q) => fetchQuery(q)));
  };

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

      if (ctx.gcTimer) {
        clearTimeout(ctx.gcTimer);
        ctx.gcTimer = null;
      }

      for (const [, entry] of entries) {
        entry.observers.clear();
        entry.inflight?.controller.abort();
      }

      entries.clear();
    },

    get disposed(): boolean {
      return disposed;
    },

    fetch: fetchQuery,

    fetchMany,

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

    observeMany<T = unknown, S = T>(
      keys: QueryKey[],
      extras?: {
        placeholderData?: S | (() => S | undefined);
        select?: (data: T | undefined) => S | undefined;
      },
    ): SyncStore<QueryState<S>[]> {
      // Watch-side extras only, forwarded to every key's store. Fetching is
      // deliberately out of scope here — per-key sources belong in per-key
      // observe() calls.
      const stores = keys.map((k) => watchInternal<T, S>(ctx, k, extras));

      return {
        peek(): QueryState<S>[] {
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
