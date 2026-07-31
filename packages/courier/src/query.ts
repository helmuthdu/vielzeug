import { retry } from '@vielzeug/arsenal';

import type { AsyncState, Query, QueryCache, QueryContext, QueryDefinition, QueryKey, Unsubscribe } from './types';

import { warn } from './_dev';
import { CourierDisposedError } from './errors';
import { hash } from './serialize';

const DEFAULT_STALE_TIME = 0;

type Entry<T> = {
  controller: AbortController | undefined;
  definition: QueryDefinition<T> | undefined;
  key: QueryKey;
  listeners: Set<() => void>;
  promise: Promise<T> | undefined;
  snapshot: AsyncState<T>;
};

type CancellableQueryCache = QueryCache & {
  cancelAll(): void;
};

function loading<T>(isFetching = false): AsyncState<T> {
  return { data: undefined, error: null, isFetching, status: 'loading', updatedAt: undefined };
}

/** Transport-agnostic cache. It only knows keys and fetch functions. */
export function createQueryCache(options?: {
  signal?: AbortSignal;
  staleTime?: number;
  times?: number;
}): CancellableQueryCache {
  const entries = new Map<string, Entry<unknown>>();
  let disposed = options?.signal?.aborted ?? false;

  const cancelAll = (): void => {
    for (const entry of entries.values()) entry.controller?.abort();
  };

  const clear = (): void => {
    const cleared = [...entries.values()];

    cancelAll();
    entries.clear();

    for (const entry of cleared) {
      entry.snapshot = loading();
      notify(entry);
    }
  };

  options?.signal?.addEventListener(
    'abort',
    () => {
      disposed = true;
      clear();
    },
    { once: true },
  );

  const entryFor = <T>(key: QueryKey): Entry<T> => {
    const id = hash(key);
    let entry = entries.get(id) as Entry<T> | undefined;

    if (!entry) {
      entry = {
        controller: undefined,
        definition: undefined,
        key,
        listeners: new Set(),
        promise: undefined,
        snapshot: loading<T>(),
      };
      entries.set(id, entry as Entry<unknown>);
    }

    return entry;
  };

  const notify = (entry: Entry<unknown>): void => {
    for (const listener of [...entry.listeners]) listener();
  };

  const fetchEntry = <T>(key: QueryKey, entry: Entry<T>, force: boolean): Promise<T> => {
    if (disposed) return Promise.reject(new CourierDisposedError('QueryCache'));

    if (!entry.definition) return Promise.reject(new Error(`No fetch function registered for query ${hash(key)}.`));

    const staleTime = entry.definition.staleTime ?? options?.staleTime ?? DEFAULT_STALE_TIME;

    if (
      !force &&
      entry.snapshot.status === 'success' &&
      Date.now() - entry.snapshot.updatedAt < staleTime &&
      !entry.snapshot.isFetching
    ) {
      return Promise.resolve(entry.snapshot.data);
    }

    if (entry.promise) return entry.promise;

    const controller = new AbortController();

    entry.controller = controller;
    entry.snapshot =
      entry.snapshot.status === 'success' ? { ...entry.snapshot, isFetching: true } : { ...loading<T>(true) };
    notify(entry as Entry<unknown>);

    const promise = retry<T>(() => entry.definition!.fetch({ key, signal: controller.signal } as QueryContext), {
      signal: controller.signal,
      times: options?.times ?? 1,
    }).then(
      (data) => {
        entry.snapshot = { data, error: null, isFetching: false, status: 'success', updatedAt: Date.now() };
        entry.controller = undefined;
        entry.promise = undefined;
        notify(entry as Entry<unknown>);

        return data;
      },
      (cause: unknown) => {
        const error = cause instanceof Error ? cause : new Error(String(cause));

        entry.snapshot = {
          data: entry.snapshot.data,
          error,
          isFetching: false,
          status: 'error',
          updatedAt: Date.now(),
        };
        entry.controller = undefined;
        entry.promise = undefined;
        notify(entry as Entry<unknown>);

        throw error;
      },
    );

    entry.promise = promise;

    return promise;
  };

  const cache: CancellableQueryCache = {
    cancelAll() {
      cancelAll();
    },
    clear() {
      clear();
    },
    create<T>(definition: QueryDefinition<T>): Query<T> {
      let entry = entryFor<T>(definition.key);

      entry.definition = definition;

      const subscriptions = new Set<() => void>();
      const resolveEntry = (): Entry<T> => {
        const current = entryFor<T>(definition.key);

        if (current !== entry) {
          for (const subscription of subscriptions) entry.listeners.delete(subscription);

          entry = current;
          entry.definition = definition;

          for (const subscription of subscriptions) entry.listeners.add(subscription);
        }

        return entry;
      };

      return {
        dispose() {
          for (const subscription of subscriptions) entry.listeners.delete(subscription);
          subscriptions.clear();
        },
        fetch: () => fetchEntry(definition.key, resolveEntry(), false),
        getSnapshot: () => resolveEntry().snapshot,
        invalidate() {
          const current = resolveEntry();

          if (current.snapshot.status === 'success') {
            current.snapshot = { ...current.snapshot, updatedAt: 0 };
            notify(current as Entry<unknown>);
          }
        },
        refetch: () => fetchEntry(definition.key, resolveEntry(), true),
        subscribe(listener: () => void): Unsubscribe {
          const notifyListener = () => {
            resolveEntry();
            listener();
          };

          resolveEntry().listeners.add(notifyListener);

          const unsubscribe = () => {
            entry.listeners.delete(notifyListener);
            subscriptions.delete(notifyListener);
          };

          subscriptions.add(notifyListener);

          return unsubscribe;
        },
      };
    },
    get<T>(key: QueryKey): T | undefined {
      const entry = entries.get(hash(key)) as Entry<T> | undefined;

      return entry?.snapshot.status === 'success' ? entry.snapshot.data : undefined;
    },
    getSnapshot<T>(key: QueryKey): AsyncState<T> | null {
      return (entries.get(hash(key)) as Entry<T> | undefined)?.snapshot ?? null;
    },
    invalidate(key: QueryKey) {
      for (const entry of entries.values()) {
        const matches =
          key.length <= entry.key.length && key.every((atom, index) => hash(atom) === hash(entry.key[index]));

        if (matches) {
          if (entry.snapshot.status === 'success') entry.snapshot = { ...entry.snapshot, updatedAt: 0 };

          notify(entry);
        }
      }
    },
    keys() {
      return [...entries.values()].map((entry) => entry.key);
    },
    refetchStale() {
      for (const entry of entries.values()) {
        if (!entry.definition || entry.snapshot.status !== 'success' || entry.snapshot.isFetching) continue;

        const staleTime = entry.definition.staleTime ?? options?.staleTime ?? DEFAULT_STALE_TIME;

        if (Date.now() - entry.snapshot.updatedAt >= staleTime) {
          void fetchEntry(entry.definition.key, entry, true).catch(() => {
            warn(`Failed to refetch stale query ${hash(entry.definition!.key)}.`);
          });
        }
      }
    },
    set<T>(key: QueryKey, data: T, setOptions?: { updatedAt?: number }) {
      const entry = entryFor<T>(key);

      entry.snapshot = {
        data,
        error: null,
        isFetching: false,
        status: 'success',
        updatedAt: setOptions?.updatedAt ?? Date.now(),
      };
      notify(entry as Entry<unknown>);
    },
    subscribe(key: QueryKey, listener: () => void): Unsubscribe {
      let entry = entryFor(key);
      const notifyListener = () => {
        const current = entryFor(key);

        if (current !== entry) {
          entry.listeners.delete(notifyListener);
          entry = current;
          entry.listeners.add(notifyListener);
        }

        listener();
      };

      entry.listeners.add(notifyListener);

      return () => entry.listeners.delete(notifyListener);
    },
  };

  return cache;
}
