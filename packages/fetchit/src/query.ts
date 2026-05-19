import type { RetryOptions } from './retry';
import type { AsyncStatus, QueryKey, QueryState, SyncStore, Unsubscribe } from './types';

import { NO_RETRY, runWithRetry } from './retry';
import { stableStringify } from './serialize';

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

export type PrefetchOptions<T> = QueryOptions<T> & {
  throwOnError?: boolean;
};

export type QueryClientOptions = {
  gcTime?: number;
  /** Revalidate stale observed entries when the document regains focus. */
  refetchOnFocus?: boolean;
  /** Revalidate stale observed entries when the network comes back online. */
  refetchOnReconnect?: boolean;
  staleTime?: number;
} & RetryOptions;

type QueryObserver<T, S> = {
  listener: (state: QueryState<S>) => void;
  placeholderData?: S | (() => S | undefined);
  previous?: QueryState<S>;
  select?: (data: T | undefined) => S | undefined;
};

type CacheEntry<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  fn: ((ctx: QueryFnContext) => Promise<T>) | undefined;
  gcTime: number;
  hash: string;
  inflight: { controller: AbortController; promise: Promise<T> } | null;
  isFetching: boolean;
  key: QueryKey;
  maxAttempts: number;
  observers: Set<QueryObserver<T, unknown>>;
  retryDelay: RetryOptions['retryDelay'];
  shouldRetry: RetryOptions['shouldRetry'];
  staleTime: number;
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
  const maxAttemptsDefault = opts?.maxAttempts ?? NO_RETRY;
  const retryDelayDefault = opts?.retryDelay;
  const shouldRetryDefault = opts?.shouldRetry;

  let disposed = false;

  const entries = new Map<string, CacheEntry>();
  const gcTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function toBaseState<T>(entry: CacheEntry<T>): QueryState<T> {
    if (entry.status === 'pending') {
      return {
        data: entry.data,
        error: null,
        isFetching: true,
        status: 'pending',
        updatedAt: entry.updatedAt,
      };
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
    const selected = observer.select ? observer.select(base.data as T | undefined) : (base.data as S | undefined);
    const data =
      selected !== undefined || base.status !== 'pending'
        ? selected
        : resolveValue(observer.placeholderData as S | (() => S | undefined) | undefined);

    return { ...base, data } as QueryState<S>;
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
        : metaUnchanged && prev!.updatedAt === next.updatedAt && dataUnchanged;

      if (shouldSkip) {
        continue;
      }

      typed.previous = next;
      typed.listener(next);
    }
  }

  function cancelGc(hash: string) {
    const timer = gcTimers.get(hash);

    if (!timer) return;

    clearTimeout(timer);
    gcTimers.delete(hash);
  }

  function scheduleGc<T>(entry: CacheEntry<T>) {
    cancelGc(entry.hash);

    if (entry.observers.size > 0) {
      return;
    }

    if (entry.gcTime === 0) {
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
    }, entry.gcTime);

    gcTimers.set(entry.hash, timer);
  }

  function ensureEntry<T>(key: QueryKey, gcTime = gcTimeDefault): CacheEntry<T> {
    const hash = stableStringify(key);
    let entry = entries.get(hash) as CacheEntry<T> | undefined;

    if (!entry) {
      entry = {
        data: undefined,
        error: null,
        fn: undefined,
        gcTime,
        hash,
        inflight: null,
        isFetching: false,
        key,
        maxAttempts: maxAttemptsDefault,
        observers: new Set(),
        retryDelay: retryDelayDefault,
        shouldRetry: shouldRetryDefault,
        staleTime: staleTimeDefault,
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

  function isKeyOrPrefix(entryKey: QueryKey, prefixHash: readonly string[]): boolean {
    if (prefixHash.length > entryKey.length) return false;

    return prefixHash.every((seg, i) => seg === stableStringify(entryKey[i]));
  }

  function markFetching<T>(entry: CacheEntry<T>) {
    entry.isFetching = true;

    if (entry.status === 'idle') {
      entry.status = 'pending';
      entry.error = null;
    }

    notify(entry);
  }

  function commitSuccess<T>(entry: CacheEntry<T>, data: T) {
    entry.data = data;
    entry.error = null;
    entry.status = 'success';
    entry.updatedAt = Date.now();
    entry.isFetching = false;
    entry.inflight = null;
    scheduleGc(entry);
    notify(entry);
  }

  function rollback<T>(entry: CacheEntry<T>, previous: EntrySnapshot<T>) {
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

    scheduleGc(entry);
    notify(entry);
  }

  function commitError<T>(entry: CacheEntry<T>, error: Error) {
    entry.error = error;
    entry.status = 'error';
    entry.updatedAt = Date.now();
    entry.isFetching = false;
    entry.inflight = null;
    scheduleGc(entry);
    notify(entry);
  }

  // Internal: starts the network fetch for an entry whose fn and retry config are already
  // set. Does not touch any entry config field — safe to call from background revalidation
  // paths (invalidate, focus, reconnect) without corrupting user-visible metadata.
  function startFetch<T>(entry: CacheEntry<T>): Promise<T> {
    // Guard against re-entrant calls (e.g. a synchronous observer callback that
    // calls qc.fetch() for the same key during markFetching's notify round).
    if (entry.inflight) return entry.inflight.promise;

    const queryFn = entry.fn as (ctx: QueryFnContext) => Promise<T>;
    const queryKey = entry.key;
    const { maxAttempts, retryDelay, shouldRetry } = entry;
    const controller = new AbortController();
    const prev: EntrySnapshot<T> = {
      data: entry.data,
      error: entry.error,
      status: entry.status,
      updatedAt: entry.updatedAt,
    };

    markFetching(entry);

    const promise = (async () => {
      try {
        const data = await runWithRetry(
          () => queryFn({ key: queryKey, signal: controller.signal }),
          maxAttempts,
          retryDelay,
          shouldRetry,
          controller.signal,
        );

        commitSuccess(entry, data);

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const isAborted = controller.signal.aborted || error.name === 'AbortError';

        if (isAborted) {
          rollback(entry, prev);
        } else {
          commitError(entry, error);
        }

        throw error;
      }
    })();

    entry.inflight = { controller, promise };

    return promise;
  }

  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T | undefined> {
    if (disposed) throw new Error('[fetchit] QueryClient has been disposed');

    const {
      enabled = true,
      fn: queryFn,
      gcTime = gcTimeDefault,
      initialData,
      key: queryKey,
      maxAttempts = maxAttemptsDefault,
      retryDelay = retryDelayDefault,
      shouldRetry = shouldRetryDefault,
      staleTime = staleTimeDefault,
    } = options;

    const entry = ensureEntry<T>(queryKey, gcTime);

    entry.gcTime = gcTime;
    entry.fn = queryFn;
    entry.staleTime = staleTime;

    if (initialData !== undefined && entry.data === undefined) {
      const initVal = resolveValue(initialData);

      if (initVal !== undefined) {
        entry.data = initVal;
        entry.error = null;
        entry.status = 'success';
        entry.updatedAt = Date.now();
      }
    }

    if (!enabled) {
      return entry.data as T | undefined;
    }

    if (
      entry.status === 'success' &&
      entry.updatedAt !== undefined &&
      Date.now() - entry.updatedAt < staleTime &&
      !entry.isFetching
    ) {
      return entry.data as T | undefined;
    }

    if (entry.inflight) return entry.inflight.promise;

    entry.maxAttempts = maxAttempts;
    entry.retryDelay = retryDelay;
    entry.shouldRetry = shouldRetry;

    return startFetch(entry);
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
    if (entry.fn === undefined) {
      // No stored fn means this entry was seeded via set() alone. Fall back to
      // explicit eviction so the entry resets to idle and subscribers are notified.
      evictEntry(entry);

      return;
    }

    if (entry.isFetching) return;

    startFetch(entry).catch(() => {});
  }

  function invalidate(key: QueryKey) {
    const prefixHash = key.map(stableStringify);

    for (const [, entry] of entries) {
      if (isKeyOrPrefix(entry.key, prefixHash)) {
        if (entry.observers.size > 0) {
          revalidateObservedEntry(entry);
          continue;
        }

        evictEntry(entry);
      }
    }
  }

  function clearCache() {
    for (const [, entry] of entries) {
      evictEntry(entry);
    }
  }

  function set<T>(key: QueryKey, data: T, opts?: { gcTime?: number }): void;
  function set<T>(key: QueryKey, updater: (old: T | undefined) => T, opts?: { gcTime?: number }): void;
  function set<T>(key: QueryKey, dataOrUpdater: T | ((old: T | undefined) => T), opts?: { gcTime?: number }) {
    const entry = ensureEntry<T>(key);
    const gcTime = opts?.gcTime ?? entry.gcTime;

    entry.data =
      typeof dataOrUpdater === 'function' ? (dataOrUpdater as (old: T | undefined) => T)(entry.data) : dataOrUpdater;
    entry.error = null;
    entry.status = 'success';
    entry.updatedAt = Date.now();
    entry.gcTime = gcTime;
    scheduleGc(entry);
    notify(entry);
  }

  function get<T>(key: QueryKey): T | undefined {
    return (entries.get(stableStringify(key))?.data as T | undefined) ?? undefined;
  }

  function getState<T>(key: QueryKey): QueryState<T> | null {
    const entry = entries.get(stableStringify(key)) as CacheEntry<T> | undefined;

    if (!entry) return null;

    return toBaseState(entry);
  }

  function subscribe<T = unknown, S = T>(
    key: QueryKey,
    listener: (state: QueryState<S>) => void,
    opts?: { placeholderData?: S | (() => S | undefined); select?: (data: T | undefined) => S | undefined },
  ): Unsubscribe {
    const entry = ensureEntry<T>(key);
    const observer: QueryObserver<T, S> = {
      listener,
      placeholderData: opts?.placeholderData,
      select: opts?.select,
    };

    cancelGc(entry.hash);

    observer.previous = toObserverState(entry, observer);
    listener(observer.previous);

    entry.observers.add(observer as QueryObserver<T, unknown>);

    return () => {
      entry.observers.delete(observer as QueryObserver<T, unknown>);

      if (entry.observers.size === 0) {
        scheduleGc(entry);
      }
    };
  }

  function watch<T = unknown, S = T>(
    key: QueryKey,
    opts?: { placeholderData?: S | (() => S | undefined); select?: (data: T | undefined) => S | undefined },
  ): SyncStore<QueryState<S>> {
    return {
      peek(): QueryState<S> {
        const entry = entries.get(stableStringify(key)) as CacheEntry<T> | undefined;

        if (!entry) return IDLE_STATE as QueryState<S>;

        return toObserverState(entry, { listener: () => {}, ...opts });
      },

      subscribe(onStoreChange: () => void): Unsubscribe {
        const entry = ensureEntry<T>(key);

        cancelGc(entry.hash);

        // Single observer per subscription — peek() provides the initial snapshot
        // so onStoreChange is only fired on subsequent state changes.
        // This satisfies the useSyncExternalStore contract (and equivalents in Vue/Svelte).
        const observer: QueryObserver<T, S> = {
          ...opts,
          listener: () => onStoreChange(),
          previous: toObserverState(entry, { listener: () => {}, ...opts }),
        };

        entry.observers.add(observer as QueryObserver<T, unknown>);

        return () => {
          entry.observers.delete(observer as QueryObserver<T, unknown>);

          if (entry.observers.size === 0) {
            scheduleGc(entry);
          }
        };
      },
    };
  }

  function cancel(key: QueryKey) {
    const entry = entries.get(stableStringify(key));

    if (!entry?.inflight) return;

    entry.inflight.controller.abort();
  }

  async function prefetchQuery<T>(options: PrefetchOptions<T>): Promise<void> {
    const { throwOnError = false, ...queryOptions } = options;

    try {
      await fetchQuery(queryOptions);
    } catch (error) {
      if (throwOnError) throw error;
    }
  }

  function isStaleAndRevalidatable(entry: CacheEntry): boolean {
    if (entry.observers.size === 0 || entry.fn === undefined || entry.isFetching) return false;

    // A success entry is stale when its data is older than staleTime.
    if (entry.status === 'success' && entry.updatedAt !== undefined) {
      return Date.now() - entry.updatedAt >= entry.staleTime;
    }

    // An error entry that still holds usable stale data (from a previous successful fetch)
    // should also revalidate on reconnect/focus so the app can recover automatically.
    if (entry.status === 'error' && entry.data !== undefined) {
      return true;
    }

    return false;
  }

  function refetchStaleEntries() {
    for (const [, entry] of entries) {
      if (isStaleAndRevalidatable(entry)) {
        startFetch(entry).catch(() => {});
      }
    }
  }

  let focusHandler: (() => void) | null = null;
  let reconnectHandler: (() => void) | null = null;

  // Note: refetchOnFocus and refetchOnReconnect attach global event listeners.
  // Always call dispose() when a QueryClient is no longer needed to remove them
  // and prevent memory leaks, especially with per-route or per-component clients.
  if (opts?.refetchOnFocus && typeof document !== 'undefined') {
    focusHandler = () => {
      if (document.visibilityState === 'visible') refetchStaleEntries();
    };
    document.addEventListener('visibilitychange', focusHandler);
  }

  if (opts?.refetchOnReconnect && typeof window !== 'undefined') {
    reconnectHandler = refetchStaleEntries;
    window.addEventListener('online', reconnectHandler);
  }

  return {
    cancel,
    clear: clearCache,
    dispose(): void {
      disposed = true;

      if (focusHandler) document.removeEventListener('visibilitychange', focusHandler);

      if (reconnectHandler) window.removeEventListener('online', reconnectHandler);

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
    get,
    getState,
    invalidate,
    prefetch: prefetchQuery,
    set,
    subscribe,
    [Symbol.dispose](): void {
      this.dispose();
    },
    watch,
  };
}

export type QueryClient = ReturnType<typeof createQuery>;
