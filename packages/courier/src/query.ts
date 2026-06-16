import { isAbortError, retry } from '@vielzeug/arsenal';

import type { RetryOptions } from './retry';
import type { AsyncStatus, QueryKey, QueryState, SyncStore, Unsubscribe } from './types';

import { DEFAULT_TIMES, resolveRetryDelay } from './retry';
import { stringify } from './serialize';

const DEFAULT_GC = 5 * 60_000;
const IDLE_STATE: QueryState<unknown> = Object.freeze({
  data: undefined,
  error: null,
  isFetching: false,
  status: 'idle',
  updatedAt: undefined,
});

type EntryStatus = AsyncStatus;

export type QueryFnContext = {
  key: QueryKey;
  signal: AbortSignal;
};

/**
 * Options for `qc.fetch()`. Always throws on error and returns `T`.
 * Use `observe()` for reactive subscriptions with select/placeholder support.
 */
export type QueryOptions<T> = {
  /** When `false` the fetch is skipped and the entry stays in its current state. Defaults to `true`. */
  enabled?: boolean;
  fn: (ctx: QueryFnContext) => Promise<T>;
  gcTime?: number;
  /** Pre-seed the cache as a successful entry when no data exists. Subject to normal staleTime checks. */
  initialData?: T | (() => T | undefined);
  key: QueryKey;
  staleTime?: number;
} & RetryOptions;

/**
 * Options for `qc.observe()`. Extends `QueryOptions` with reactive-only fields.
 * Pass `fetch: false` for a read-through store that does not trigger a network call.
 */
export type ObserveOptions<T, S = T> = QueryOptions<T> & {
  /**
   * When `false`, no background fetch is triggered. The store reflects whatever is
   * already in the cache. Useful when another path is responsible for populating the entry.
   * Defaults to `true`.
   */
  fetch?: boolean;
  /**
   * Temporary value shown while a fetch is in-flight and no cached data exists.
   * Does not affect cache state — only the value returned by `store.peek()`.
   */
  placeholderData?: S | (() => S | undefined);
  /** Transform the cached data before it is delivered to store subscribers. */
  select?: (data: T | undefined) => S | undefined;
};

export type QueryClientOptions = {
  gcTime?: number;
  staleTime?: number;
} & RetryOptions;

type QueryObserver<T, S> = {
  listener: () => void;
  placeholderData?: S | (() => S | undefined);
  previous?: QueryState<S>;
  select?: (data: T | undefined) => S | undefined;
};

// Fetch configuration stored separately from cache state so entry data fields
// are never mutated by late-arriving fetchQuery calls from different callers.
type FetchConfig<T = unknown> = {
  delay: RetryOptions['delay'];
  fn: (ctx: QueryFnContext) => Promise<T>;
  gcTime: number;
  shouldRetry: RetryOptions['shouldRetry'];
  staleTime: number;
  times: number;
};

type CacheEntry<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  hash: string;
  inflight: { controller: AbortController; promise: Promise<T> } | null;
  isFetching: boolean;
  key: QueryKey;
  // Last config used to successfully start a fetch — used for background revalidation.
  lastConfig: FetchConfig<T> | undefined;
  observers: Set<QueryObserver<T, unknown>>;
  // Pre-computed per-segment hashes for O(1) prefix matching in invalidate().
  segmentHashes: readonly string[];
  status: EntryStatus;
  updatedAt: number | undefined;
};

type EntrySnapshot<T> = {
  data: T | undefined;
  error: Error | null;
  status: EntryStatus;
  updatedAt: number | undefined;
};

function resolveValue<T>(v: T | (() => T | undefined) | undefined): T | undefined {
  return typeof v === 'function' ? (v as () => T | undefined)() : v;
}

export function createQuery(opts?: QueryClientOptions) {
  const staleTimeDefault = opts?.staleTime ?? 0;
  const gcTimeDefault = opts?.gcTime ?? DEFAULT_GC;
  const timesDefault = opts?.times ?? DEFAULT_TIMES;
  const delayDefault = opts?.delay;
  const shouldRetryDefault = opts?.shouldRetry;

  let disposed = false;
  const disposeController = new AbortController();

  const entries = new Map<string, CacheEntry>();
  const gcTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function toBaseState<T>(entry: CacheEntry<T>): QueryState<T> {
    if (entry.status === 'pending') {
      return {
        data: undefined,
        error: null,
        isFetching: true,
        status: 'pending',
        updatedAt: undefined,
      } as QueryState<T>;
    }

    if (entry.status === 'success') {
      return {
        data: entry.data as T,
        error: null,
        isFetching: entry.isFetching,
        status: 'success',
        updatedAt: entry.updatedAt as number,
      };
    }

    if (entry.status === 'error') {
      return {
        data: entry.data,
        error: entry.error as Error,
        isFetching: entry.isFetching,
        status: 'error',
        updatedAt: entry.updatedAt as number,
      };
    }

    return IDLE_STATE as QueryState<T>;
  }

  function toObserverState<T, S>(entry: CacheEntry<T>, observer: QueryObserver<T, S>): QueryState<S> {
    const base = toBaseState(entry);

    if (base.status === 'pending') {
      const placeholder = resolveValue(observer.placeholderData as S | (() => S | undefined) | undefined);

      return { ...base, data: placeholder } as QueryState<S>;
    }

    const selected = observer.select ? observer.select(base.data as T | undefined) : (base.data as S | undefined);

    return { ...base, data: selected } as QueryState<S>;
  }

  function notify<T>(entry: CacheEntry<T>) {
    for (const observer of entry.observers) {
      const typed = observer as QueryObserver<T, unknown>;
      const next = toObserverState(entry, typed);
      const prev = typed.previous;

      const dataUnchanged = Object.is(prev?.data, next.data);
      const metaUnchanged =
        !!prev &&
        prev.status === next.status &&
        prev.isFetching === next.isFetching &&
        Object.is(prev.error, next.error);

      // When a select transform is present, data deduplication is based solely on
      // the projected value — updatedAt changes on every raw write but should not
      // trigger a notification when the selected result is identical.
      const shouldSkip = typed.select
        ? metaUnchanged && dataUnchanged
        : metaUnchanged && prev?.updatedAt === next.updatedAt && dataUnchanged;

      if (shouldSkip) {
        continue;
      }

      typed.previous = next;
      typed.listener();
    }
  }

  function cancelGc(hash: string) {
    const timer = gcTimers.get(hash);

    if (!timer) return;

    clearTimeout(timer);
    gcTimers.delete(hash);
  }

  function scheduleGc<T>(entry: CacheEntry<T>, gcTime: number) {
    if (disposed) return;

    cancelGc(entry.hash);

    if (entry.observers.size > 0) {
      return;
    }

    if (gcTime === 0) {
      entries.delete(entry.hash);

      return;
    }

    const timer = setTimeout(() => {
      const current = entries.get(entry.hash);

      if (!current || current.observers.size > 0 || current.isFetching) {
        return;
      }

      entries.delete(entry.hash);
      gcTimers.delete(entry.hash);
    }, gcTime);

    gcTimers.set(entry.hash, timer);
  }

  function ensureEntry<T>(key: QueryKey): CacheEntry<T> {
    const hash = stringify(key);
    let entry = entries.get(hash) as CacheEntry<T> | undefined;

    if (!entry) {
      entry = {
        data: undefined,
        error: null,
        hash,
        inflight: null,
        isFetching: false,
        key,
        lastConfig: undefined,
        observers: new Set(),
        segmentHashes: key.map((k) => stringify(k)),
        status: 'idle',
        updatedAt: undefined,
      };
      entries.set(hash, entry as CacheEntry<unknown>);
    }

    return entry;
  }

  function deleteEntry<T>(entry: CacheEntry<T>) {
    entry.inflight?.controller.abort();
    cancelGc(entry.hash);
    entries.delete(entry.hash);
  }

  function isKeyOrPrefix(entry: CacheEntry, prefixHash: readonly string[]): boolean {
    if (prefixHash.length > entry.segmentHashes.length) return false;

    return prefixHash.every((seg, i) => seg === entry.segmentHashes[i]);
  }

  function markFetching<T>(entry: CacheEntry<T>) {
    entry.isFetching = true;

    if (entry.status === 'idle') {
      entry.status = 'pending';
      entry.error = null;
    }

    notify(entry);
  }

  function commitSuccess<T>(entry: CacheEntry<T>, data: T, gcTime: number) {
    entry.data = data;
    entry.error = null;
    entry.status = 'success';
    entry.updatedAt = Date.now();
    entry.isFetching = false;
    entry.inflight = null;
    scheduleGc(entry, gcTime);
    notify(entry);
  }

  function rollback<T>(entry: CacheEntry<T>, previous: EntrySnapshot<T>, gcTime: number) {
    entry.data = previous.data;
    entry.error = previous.error;
    entry.status = previous.status;
    entry.updatedAt = previous.updatedAt;
    entry.isFetching = false;
    entry.inflight = null;

    if (entry.observers.size === 0 && entry.status === 'idle' && entry.data === undefined) {
      deleteEntry(entry);

      return;
    }

    scheduleGc(entry, gcTime);
    notify(entry);
  }

  function commitError<T>(entry: CacheEntry<T>, error: Error, gcTime: number) {
    entry.error = error;
    entry.status = 'error';
    entry.updatedAt = Date.now();
    entry.isFetching = false;
    entry.inflight = null;
    scheduleGc(entry, gcTime);
    notify(entry);
  }

  // Internal: starts the network fetch for an entry using the given FetchConfig.
  // Safe to call from background revalidation paths without corrupting cache state.
  // Callers are responsible for updating entry.lastConfig before invoking this.
  function startFetch<T>(entry: CacheEntry<T>, config: FetchConfig<T>): Promise<T> {
    if (entry.inflight) return entry.inflight.promise;

    const { delay, fn, gcTime, shouldRetry, times } = config;
    const controller = new AbortController();
    const prev: EntrySnapshot<T> = {
      data: entry.data,
      error: entry.error,
      status: entry.status,
      updatedAt: entry.updatedAt,
    };

    // Create the promise and assign it to inflight BEFORE calling markFetching.
    // markFetching notifies observers synchronously; assigning inflight first closes
    // the re-entrancy window — any qc.fetch() for the same key triggered during the
    // notification round returns this promise instead of spawning a second fetch.
    const promise = (async () => {
      try {
        const data = await retry(() => fn({ key: entry.key, signal: controller.signal }), {
          delay: (attempt) => resolveRetryDelay(attempt, delay),
          shouldRetry,
          signal: controller.signal,
          times,
        });

        commitSuccess(entry, data, gcTime);

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const isAborted = controller.signal.aborted || isAbortError(error);

        if (isAborted) {
          rollback(entry, prev, gcTime);
        } else {
          commitError(entry, error, gcTime);
        }

        throw error;
      }
    })();

    entry.inflight = { controller, promise };
    markFetching(entry);

    return promise;
  }

  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T> {
    if (disposed) throw new Error('[courier] QueryClient has been disposed');

    const {
      delay = delayDefault,
      enabled = true,
      fn,
      gcTime = gcTimeDefault,
      initialData,
      key,
      shouldRetry = shouldRetryDefault,
      staleTime = staleTimeDefault,
      times = timesDefault,
    } = options;

    const entry = ensureEntry<T>(key);
    const config: FetchConfig<T> = { delay, fn, gcTime, shouldRetry, staleTime, times };

    if (initialData !== undefined && (entry.status === 'idle' || entry.data === undefined)) {
      const initVal = resolveValue(initialData);

      if (initVal !== undefined) {
        entry.data = initVal;
        entry.error = null;
        entry.status = 'success';
        entry.updatedAt = Date.now();
      }
    }

    if (!enabled) {
      return entry.data as T;
    }

    if (
      entry.status === 'success' &&
      entry.updatedAt !== undefined &&
      Date.now() - entry.updatedAt < staleTime &&
      !entry.isFetching
    ) {
      // Store config for future background revalidation even on a cache hit.
      entry.lastConfig = config;

      return entry.data as T;
    }

    // Keep config for background revalidation even when joining an in-flight
    // request — so the most recent fn / staleTime / retry options take effect
    // when the next invalidation or background refetch fires.
    entry.lastConfig = config;

    if (entry.inflight) return entry.inflight.promise;

    return startFetch(entry, config);
  }

  function evictEntry<T>(entry: CacheEntry<T>) {
    entry.inflight?.controller.abort();

    if (entry.observers.size > 0) {
      entry.inflight = null;
      entry.isFetching = false;
      entry.status = 'idle';
      entry.data = undefined;
      entry.error = null;
      entry.updatedAt = undefined;
      notify(entry);

      return;
    }

    deleteEntry(entry);
  }

  function revalidateObservedEntry<T>(entry: CacheEntry<T>) {
    if (!entry.lastConfig) {
      // No stored config means this entry was seeded via set() alone. Fall back to
      // explicit eviction so the entry resets to idle and subscribers are notified.
      evictEntry(entry);

      return;
    }

    if (entry.isFetching) return;

    startFetch(entry, entry.lastConfig as FetchConfig<T>).catch(() => {});
  }

  function invalidate(key: QueryKey) {
    const prefixHash = key.map((k) => stringify(k));

    for (const entry of [...entries.values()]) {
      if (isKeyOrPrefix(entry, prefixHash)) {
        if (entry.observers.size > 0) {
          revalidateObservedEntry(entry);
          continue;
        }

        evictEntry(entry);
      }
    }
  }

  function clearCache() {
    for (const entry of [...entries.values()]) {
      evictEntry(entry);
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
  ) {
    const entry = ensureEntry<T>(key);
    const gcTime = opts?.gcTime ?? entry.lastConfig?.gcTime ?? gcTimeDefault;

    entry.data =
      typeof dataOrUpdater === 'function' ? (dataOrUpdater as (old: T | undefined) => T)(entry.data) : dataOrUpdater;
    entry.error = null;
    entry.status = 'success';
    entry.updatedAt = opts?.updatedAt ?? Date.now();
    notify(entry);
    scheduleGc(entry, gcTime);
  }

  function get<T>(key: QueryKey): T | undefined {
    const entry = entries.get(stringify(key));

    return entry ? (entry.data as T | undefined) : undefined;
  }

  function getState<T>(key: QueryKey): QueryState<T> | null {
    const entry = entries.get(stringify(key)) as CacheEntry<T> | undefined;

    if (!entry) return null;

    return toBaseState(entry);
  }

  function watchInternal<T = unknown, S = T>(
    key: QueryKey,
    opts?: { placeholderData?: S | (() => S | undefined); select?: (data: T | undefined) => S | undefined },
  ): SyncStore<QueryState<S>> {
    // Stable observer used by peek() — hoisted to avoid a new object allocation
    // on every getSnapshot call (React's useSyncExternalStore calls this on every render).
    const peekObserver: QueryObserver<T, S> = { listener: () => {}, ...opts };

    return {
      peek(): QueryState<S> {
        const entry = entries.get(stringify(key)) as CacheEntry<T> | undefined;

        if (!entry) return IDLE_STATE as QueryState<S>;

        return toObserverState(entry, peekObserver);
      },

      subscribe(onStoreChange: () => void): Unsubscribe {
        const entry = ensureEntry<T>(key);

        cancelGc(entry.hash);

        // Single observer per subscription — peek() provides the initial snapshot
        // so onStoreChange is only fired on subsequent state changes.
        // This satisfies the useSyncExternalStore contract (and equivalents in Vue/Svelte).
        const observer: QueryObserver<T, S> = {
          ...opts,
          listener: onStoreChange,
          previous: toObserverState(entry, peekObserver),
        };

        entry.observers.add(observer as QueryObserver<T, unknown>);

        return () => {
          entry.observers.delete(observer as QueryObserver<T, unknown>);

          if (entry.observers.size === 0) {
            scheduleGc(entry, entry.lastConfig?.gcTime ?? gcTimeDefault);
          }
        };
      },
    };
  }

  function cancel(key: QueryKey) {
    const entry = entries.get(stringify(key));

    if (!entry?.inflight) return;

    entry.inflight.controller.abort();
  }

  async function fetchMany<T = unknown>(queries: QueryOptions<T>[]): Promise<T[]> {
    return Promise.all(queries.map((q) => fetchQuery(q)));
  }

  /**
   * Returns a `SyncStore` for `key` and optionally triggers a background fetch.
   * This is the primary single-call pattern for components: subscribe to
   * `store.subscribe`, snapshot via `store.peek()`, and let the fetch populate
   * the cache automatically.
   *
   * Pass `fetch: false` for a pure read-through store that does not trigger a
   * network call — useful when another path is responsible for populating the entry.
   *
   * Errors surface via `store.peek().status === 'error'`, not via Promise rejection.
   */
  function observe<T = unknown, S = T>(options: ObserveOptions<T, S>): SyncStore<QueryState<S>> {
    const { fetch: shouldFetch = true, placeholderData, select, ...fetchOpts } = options;

    const store = watchInternal<T, S>(options.key, { placeholderData, select });

    if (shouldFetch) {
      // Trigger a fetch without surfacing errors — the store's status field carries them.
      fetchQuery({ ...fetchOpts }).catch(() => {});
    }

    return store;
  }

  function isStaleAndRevalidatable(entry: CacheEntry): boolean {
    if (entry.observers.size === 0 || !entry.lastConfig || entry.isFetching) return false;

    // A success entry is stale when its data is older than staleTime.
    if (entry.status === 'success' && entry.updatedAt !== undefined) {
      return Date.now() - entry.updatedAt >= entry.lastConfig.staleTime;
    }

    // An error entry that still holds stale data (from a previous successful fetch) is also
    // eligible for revalidation, but respects the same staleTime guard to prevent hammering
    // the server on repeated focus/reconnect events.
    if (entry.status === 'error' && entry.data !== undefined && entry.updatedAt !== undefined) {
      return Date.now() - entry.updatedAt >= entry.lastConfig.staleTime;
    }

    return false;
  }

  function refetchStale() {
    for (const entry of [...entries.values()]) {
      if (isStaleAndRevalidatable(entry)) {
        startFetch(entry, entry.lastConfig as FetchConfig<unknown>).catch(() => {});
      }
    }
  }

  return {
    cancel,
    cancelAll(): void {
      for (const entry of entries.values()) {
        entry.inflight?.controller.abort();
      }
    },
    clear: clearCache,
    /** `AbortSignal` aborted when the query client is disposed. Use to tie external lifecycles to this client. */
    get disposalSignal() {
      return disposeController.signal;
    },

    dispose(): void {
      if (disposed) return;

      disposed = true;
      disposeController.abort();

      for (const [, entry] of entries) {
        // Clear observers first so in-flight rollbacks triggered by abort cannot
        // fire notifications to already-disposed subscribers.
        entry.observers.clear();
        entry.inflight?.controller.abort();
      }

      for (const [, timer] of gcTimers) {
        clearTimeout(timer);
      }

      gcTimers.clear();
      entries.clear();
    },
    get disposed() {
      return disposed;
    },
    fetch: fetchQuery,
    fetchMany,
    get,
    getState,
    invalidate,
    /** Returns all currently cached query keys as an array. Useful for SSR serialization and cache debugging. */
    keys(): QueryKey[] {
      return [...entries.values()].map((e) => e.key);
    },
    observe,
    /**
     * Observe multiple keys as a single combined store.
     * Returns a `SyncStore<QueryState[]>` whose value updates whenever any of
     * the observed keys change. Useful for parallel query status aggregation.
     */
    observeMany<T = unknown>(keys: QueryKey[]): SyncStore<QueryState<T>[]> {
      const stores = keys.map((k) => watchInternal<T>(k));

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
    refetchStale,
    set,
    /** Number of entries currently held in the cache. */
    get size(): number {
      return entries.size;
    },
    [Symbol.dispose](): void {
      this.dispose();
    },
    /**
     * Returns a read-through `SyncStore` for a key without triggering any fetch.
     * The store reflects whatever is currently in the cache and updates when other
     * code (e.g. `fetch()`, `set()`, `invalidate()`) changes the entry.
     *
     * Use `observe({ ..., fetch: false })` for the same behaviour with `select` / `placeholderData`.
     */
    watchKey<T = unknown>(key: QueryKey): SyncStore<QueryState<T>> {
      return watchInternal<T>(key);
    },
  };
}

export type QueryClient = ReturnType<typeof createQuery>;
