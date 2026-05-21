import type { AnySchema, KeyOf, RecordOf } from './types';

import { DepositDisposedError, DepositError } from './errors';

type ObserverListener<T> = (records: T[]) => void;

/**
 * Separator used between encoded key segments. The null byte (\x00) is safe
 * because `encodeURIComponent` always percent-encodes it to `%00` (a 3-character
 * string), so the raw `\x00` byte can never appear inside an encoded segment —
 * eliminating key-collision risk that a URL-safe character like `~` would carry.
 */
const SEP = '\x00';

export function encodeDbPrefix(dbName: string): string {
  return `${encodeURIComponent(dbName)}${SEP}`;
}

export function encodeStorageKey(dbName: string, table: string, key: string): string {
  return `${encodeURIComponent(dbName)}${SEP}${encodeURIComponent(table)}${SEP}${encodeURIComponent(key)}`;
}

export function encodeStorageTablePrefix(dbName: string, table: string): string {
  return `${encodeURIComponent(dbName)}${SEP}${encodeURIComponent(table)}${SEP}`;
}

export function decodeStorageTableFromKey(dbName: string, storageKey: string | null): string | undefined {
  if (!storageKey) return undefined;

  const prefix = encodeDbPrefix(dbName);

  if (!storageKey.startsWith(prefix)) return undefined;

  const tail = storageKey.slice(prefix.length);
  const end = tail.indexOf(SEP);

  if (end === -1) return undefined;

  try {
    return decodeURIComponent(tail.slice(0, end));
  } catch {
    return undefined;
  }
}

export function createObserverHub<S extends AnySchema>(
  getAll: <K extends keyof S>(table: K) => Promise<RecordOf<S, K>[]>,
  onError?: (error: unknown) => void,
) {
  const observers = new Map<string, Set<ObserverListener<unknown>>>();
  let disposed = false;

  const reportObserverError = (error: unknown): void => {
    if (onError) {
      onError(error);
    } else if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[deposit] observer notification failed', error);
    }
  };

  const notify = <K extends keyof S>(table: K): void => {
    if (disposed) return;

    const listeners = observers.get(String(table));

    if (!listeners || listeners.size === 0) return;

    void getAll(table)
      .then((records) => {
        if (disposed) return;

        const current = observers.get(String(table));

        if (!current || current.size === 0) return;

        for (const listener of current) {
          try {
            listener(records as unknown[]);
          } catch (error) {
            reportObserverError(error);
          }
        }
      })
      .catch((error) => reportObserverError(error));
  };

  const observe = <K extends keyof S>(
    table: K,
    listener: (records: RecordOf<S, K>[]) => void,
    { immediate = false }: { immediate?: boolean } = {},
  ): (() => void) => {
    if (disposed) {
      throw new DepositDisposedError('observer hub is disposed');
    }

    const key = String(table);
    const wrapped = listener as ObserverListener<unknown>;
    let listeners = observers.get(key);

    if (!listeners) {
      listeners = new Set();
      observers.set(key, listeners);
    }

    listeners.add(wrapped);

    if (immediate) notify(table);

    return () => {
      const current = observers.get(key);

      if (!current) return;

      current.delete(wrapped);

      if (current.size === 0) observers.delete(key);
    };
  };

  const dispose = (): void => {
    disposed = true;
    observers.clear();
  };

  return { dispose, notify, observe };
}

/**
 * Creates an AsyncIterable that yields a snapshot on every call to `subscribe`'s listener.
 * The first snapshot is emitted on the first `next()` call (lazy registration).
 * Only the latest pending snapshot is retained — slow consumers receive current state, not stale history.
 */
export function createWatchIterable<T>(
  subscribe: (listener: (snapshot: T[]) => void) => () => void,
): AsyncIterable<T[]> {
  return {
    [Symbol.asyncIterator]() {
      let pending: T[] | null = null;
      let waiting: ((value: IteratorResult<T[]>) => void) | null = null;
      let done = false;
      let unobserve: (() => void) | null = null;

      const finish = (): void => {
        done = true;
        unobserve?.();
        unobserve = null;

        if (waiting) {
          waiting({ done: true, value: undefined });
          waiting = null;
        }
      };

      /** Registers the observer on first use. Safe to call multiple times. */
      const ensureObserving = (): void => {
        if (unobserve || done) return;

        unobserve = subscribe((snapshot) => {
          if (waiting) {
            const resolve = waiting;

            waiting = null;
            resolve({ done: false, value: snapshot });
          } else {
            pending = snapshot; // overwrite: only the latest state matters
          }
        });
      };

      return {
        async next(): Promise<IteratorResult<T[]>> {
          // Lazy registration: observer is only wired when the consumer calls next().
          ensureObserving();

          if (pending !== null) {
            const value = pending;

            pending = null;

            return { done: false, value };
          }

          if (done) return { done: true, value: undefined };

          return new Promise<IteratorResult<T[]>>((resolve) => {
            waiting = resolve;
          });
        },

        async return(): Promise<IteratorResult<T[]>> {
          finish();

          return { done: true, value: undefined };
        },

        async throw(err?: unknown): Promise<IteratorResult<T[]>> {
          finish();

          return Promise.reject(err);
        },
      };
    },
  };
}

export function getRecordKey<S extends AnySchema, K extends keyof S>(
  schema: S,
  table: K,
  value: RecordOf<S, K>,
): KeyOf<S, K> {
  const keyField = String(schema[table].key);
  const keyValue = (value as Record<string, unknown>)[keyField];

  if (keyValue === undefined || keyValue === null) {
    throw new DepositError(
      `key field "${keyField}" in table "${String(table)}" must be a non-null value, got ${String(keyValue)}`,
    );
  }

  return keyValue as KeyOf<S, K>;
}
