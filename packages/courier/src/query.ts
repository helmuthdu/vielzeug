import { hash } from '@vielzeug/arsenal/object';
import { CourierDisposedError } from './errors';
import type { AsyncState, QueryCache, QueryContext, QueryDefinition, QueryKey, Unsubscribe } from './types';

const DEFAULT_STALE_TIME = 0;
const DEFAULT_GC_TIME = 5 * 60_000;

type Entry = {
  controller: AbortController | undefined;
  definition: QueryDefinition<unknown> | undefined;
  key: QueryKey;
  promise: Promise<unknown> | undefined;
  snapshot: AsyncState<unknown>;
};

type CancellableQueryCache = QueryCache & {
  cancelAll(): void;
};

function loading<T>(isFetching = false): AsyncState<T> {
  return { data: undefined, error: null, isFetching, status: 'loading', updatedAt: undefined };
}

/** Transport-agnostic cache. Queries are identified by explicit keys and fetch definitions.
 *  Entries with no subscribers are garbage-collected after `gcTime` (default 5 min; `Infinity` disables). */
export function createQueryCache(options?: {
  gcTime?: number;
  signal?: AbortSignal;
  staleTime?: number;
}): CancellableQueryCache {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;
  const gcTime = options?.gcTime ?? DEFAULT_GC_TIME;
  const entries = new Map<string, Entry>();
  const listeners = new Map<string, Set<Unsubscribe>>();
  let disposed = options?.signal?.aborted ?? false;
  let gcTimer: ReturnType<typeof setTimeout> | undefined;

  const hasSubscribers = (id: string): boolean => (listeners.get(id)?.size ?? 0) > 0;

  const notify = (key: QueryKey): void => {
    for (const listener of [...(listeners.get(hash(key)) ?? [])]) listener();
  };

  const scheduleGc = (): void => {
    if (gcTime === Number.POSITIVE_INFINITY || disposed) {
      if (gcTimer) clearTimeout(gcTimer);
      gcTimer = undefined;
      return;
    }

    if (gcTimer) clearTimeout(gcTimer);

    let earliest: number | undefined;

    for (const entry of entries.values()) {
      if (entry.snapshot.status !== 'success' || entry.promise) continue;
      if (hasSubscribers(hash(entry.key))) continue;

      const expiresAt = entry.snapshot.updatedAt + gcTime;

      if (earliest === undefined || expiresAt < earliest) earliest = expiresAt;
    }

    if (earliest === undefined) {
      gcTimer = undefined;
      return;
    }

    gcTimer = setTimeout(runGc, Math.max(0, earliest - Date.now()));
  };

  const runGc = (): void => {
    const now = Date.now();

    for (const [id, entry] of entries) {
      if (entry.snapshot.status !== 'success' || entry.promise) continue;
      if (hasSubscribers(id)) continue;
      if (now - entry.snapshot.updatedAt >= gcTime) entries.delete(id);
    }

    scheduleGc();
  };

  const cancelAll = (): void => {
    for (const entry of entries.values()) {
      entry.controller?.abort();
      entry.controller = undefined;
      entry.promise = undefined;
    }
  };

  const clear = (): void => {
    const keys = [...entries.values()].map((entry) => entry.key);

    cancelAll();
    entries.clear();

    if (gcTimer) {
      clearTimeout(gcTimer);
      gcTimer = undefined;
    }

    for (const key of keys) notify(key);
  };

  options?.signal?.addEventListener(
    'abort',
    () => {
      disposed = true;
      clear();
    },
    { once: true },
  );

  const entryFor = (key: QueryKey): Entry => {
    const id = hash(key);
    let entry = entries.get(id);

    if (!entry) {
      entry = {
        controller: undefined,
        definition: undefined,
        key,
        promise: undefined,
        snapshot: loading(),
      };
      entries.set(id, entry);
    }

    return entry;
  };

  const fetchEntry = <T>(entry: Entry, force: boolean): Promise<T> => {
    if (disposed) return Promise.reject(new CourierDisposedError('QueryCache'));

    if (!entry.definition)
      return Promise.reject(new Error(`No fetch function registered for query ${hash(entry.key)}.`));

    const entryStaleTime = entry.definition.staleTime ?? staleTime;

    if (
      !force &&
      entry.snapshot.status === 'success' &&
      Date.now() - entry.snapshot.updatedAt < entryStaleTime &&
      !entry.snapshot.isFetching
    ) {
      return Promise.resolve(entry.snapshot.data as T);
    }

    if (entry.promise) return entry.promise as Promise<T>;

    const controller = new AbortController();

    entry.controller = controller;
    entry.snapshot =
      entry.snapshot.status === 'success' ? { ...entry.snapshot, isFetching: true } : { ...loading<unknown>(true) };
    notify(entry.key);

    const promise = Promise.resolve()
      .then(() => entry.definition?.fetch({ key: entry.key, signal: controller.signal } as QueryContext))
      .then(
        (data) => {
          if (entry.promise !== promise) return data;

          entry.snapshot = { data, error: null, isFetching: false, status: 'success', updatedAt: Date.now() };
          entry.controller = undefined;
          entry.promise = undefined;
          notify(entry.key);
          scheduleGc();

          return data;
        },
        (cause: unknown) => {
          if (entry.promise !== promise) throw cause;

          const error = cause instanceof Error ? cause : new Error(String(cause));

          entry.snapshot = {
            data: entry.snapshot.status === 'success' ? entry.snapshot.data : undefined,
            error,
            isFetching: false,
            status: 'error',
            updatedAt: Date.now(),
          };
          entry.controller = undefined;
          entry.promise = undefined;
          notify(entry.key);

          throw error;
        },
      );

    entry.promise = promise;

    return promise as Promise<T>;
  };

  return {
    cancelAll,
    clear,
    delete(key: QueryKey): void {
      const id = hash(key);
      const entry = entries.get(id);

      if (!entry) return;

      // Prevent an aborted in-flight promise from writing a stale error snapshot
      // after this entry has been explicitly removed.
      entry.promise = undefined;
      entry.controller?.abort();
      entry.controller = undefined;

      entries.delete(id);
      notify(key);
      scheduleGc();
    },
    fetch<T>(definition: QueryDefinition<T>, fetchOptions?: { force?: boolean }): Promise<T> {
      const entry = entryFor(definition.key);

      entry.definition = definition as QueryDefinition<unknown>;

      return fetchEntry<T>(entry, fetchOptions?.force ?? false);
    },
    get<T>(key: QueryKey): T | undefined {
      const entry = entries.get(hash(key));

      return entry?.snapshot.status === 'success' ? (entry.snapshot.data as T) : undefined;
    },
    getSnapshot<T>(key: QueryKey): AsyncState<T> | null {
      return (entries.get(hash(key))?.snapshot as AsyncState<T> | undefined) ?? null;
    },
    invalidate(prefix: readonly unknown[], invalidateOptions?: { refetch?: boolean }): void {
      const refetch = invalidateOptions?.refetch ?? false;
      let invalidated = false;

      for (const entry of entries.values()) {
        const matches = prefix.length <= entry.key.length && prefix.every((atom, index) => atom === entry.key[index]);

        if (matches) {
          if (entry.snapshot.status === 'success') entry.snapshot = { ...entry.snapshot, updatedAt: 0 };

          notify(entry.key);

          if (refetch && entry.definition && !entry.promise) {
            void fetchEntry(entry, true).catch(() => {
              /* Error surfaces through cache snapshot; suppress unhandled rejection. */
            });
          }

          invalidated = true;
        }
      }

      if (invalidated) scheduleGc();
    },
    keys(): QueryKey[] {
      return [...entries.values()].map((entry) => entry.key);
    },
    set<T>(key: QueryKey, data: T, setOptions?: { updatedAt?: number }): void {
      const entry = entryFor(key);

      entry.snapshot = {
        data,
        error: null,
        isFetching: false,
        status: 'success',
        updatedAt: setOptions?.updatedAt ?? Date.now(),
      };
      notify(key);
      scheduleGc();
    },
    subscribe(key: QueryKey, listener: () => void): Unsubscribe {
      const id = hash(key);
      const keyListeners = listeners.get(id) ?? new Set<Unsubscribe>();

      keyListeners.add(listener);
      listeners.set(id, keyListeners);

      return () => {
        keyListeners.delete(listener);

        if (keyListeners.size === 0) {
          listeners.delete(id);
          scheduleGc();
        }
      };
    },
  };
}
