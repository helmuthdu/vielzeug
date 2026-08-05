import type { AsyncState, QueryCache, QueryContext, QueryDefinition, QueryKey, Unsubscribe } from './types';

import { warn } from './_dev';
import { CourierDisposedError } from './errors';
import { hash } from './serialize';

const DEFAULT_STALE_TIME = 0;

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

/** Transport-agnostic cache. Queries are identified by explicit keys and fetch definitions. */
export function createQueryCache(options?: { signal?: AbortSignal; staleTime?: number }): CancellableQueryCache {
  const entries = new Map<string, Entry>();
  const listeners = new Map<string, Set<Unsubscribe>>();
  let disposed = options?.signal?.aborted ?? false;

  const notify = (key: QueryKey): void => {
    for (const listener of [...(listeners.get(hash(key)) ?? [])]) listener();
  };

  const cancelAll = (): void => {
    for (const entry of entries.values()) entry.controller?.abort();
  };

  const clear = (): void => {
    const keys = [...entries.values()].map((entry) => entry.key);

    cancelAll();
    entries.clear();

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

    const staleTime = entry.definition.staleTime ?? options?.staleTime ?? DEFAULT_STALE_TIME;

    if (
      !force &&
      entry.snapshot.status === 'success' &&
      Date.now() - entry.snapshot.updatedAt < staleTime &&
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
      .then(() => entry.definition!.fetch({ key: entry.key, signal: controller.signal } as QueryContext))
      .then(
        (data) => {
          entry.snapshot = { data, error: null, isFetching: false, status: 'success', updatedAt: Date.now() };
          entry.controller = undefined;
          entry.promise = undefined;
          notify(entry.key);

          return data;
        },
        (cause: unknown) => {
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
    invalidate(key: QueryKey): void {
      for (const entry of entries.values()) {
        const matches =
          key.length <= entry.key.length && key.every((atom, index) => hash(atom) === hash(entry.key[index]));

        if (matches) {
          if (entry.snapshot.status === 'success') entry.snapshot = { ...entry.snapshot, updatedAt: 0 };

          notify(entry.key);
        }
      }
    },
    keys(): QueryKey[] {
      return [...entries.values()].map((entry) => entry.key);
    },
    refetchStale(): void {
      for (const entry of entries.values()) {
        if (!entry.definition || entry.snapshot.status !== 'success' || entry.snapshot.isFetching) continue;

        const staleTime = entry.definition.staleTime ?? options?.staleTime ?? DEFAULT_STALE_TIME;

        if (Date.now() - entry.snapshot.updatedAt >= staleTime) {
          void fetchEntry(entry, true).catch(() => {
            warn(`Failed to refetch stale query ${hash(entry.key)}.`);
          });
        }
      }
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
    },
    subscribe(key: QueryKey, listener: () => void): Unsubscribe {
      const id = hash(key);
      const keyListeners = listeners.get(id) ?? new Set<Unsubscribe>();

      keyListeners.add(listener);
      listeners.set(id, keyListeners);

      return () => {
        keyListeners.delete(listener);

        if (keyListeners.size === 0) listeners.delete(id);
      };
    },
  };
}
