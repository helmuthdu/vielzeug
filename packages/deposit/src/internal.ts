import type { AnySchema, KeyOf, RecordOf } from './types';

type ObserverListener<T> = (records: T[]) => void;

export function encodeStorageKey(dbName: string, table: string, key: string): string {
  return `${encodeURIComponent(dbName)}~${encodeURIComponent(table)}~${encodeURIComponent(key)}`;
}

export function encodeStorageTablePrefix(dbName: string, table: string): string {
  return `${encodeURIComponent(dbName)}~${encodeURIComponent(table)}~`;
}

export function decodeStorageTableFromKey(dbName: string, storageKey: string | null): string | undefined {
  if (!storageKey) return undefined;

  const prefix = `${encodeURIComponent(dbName)}~`;

  if (!storageKey.startsWith(prefix)) return undefined;

  const tail = storageKey.slice(prefix.length);
  const end = tail.indexOf('~');

  if (end === -1) return undefined;

  try {
    return decodeURIComponent(tail.slice(0, end));
  } catch {
    return undefined;
  }
}

export function createObserverHub<S extends AnySchema>(
  getAll: <K extends keyof S>(table: K) => Promise<RecordOf<S, K>[]>,
) {
  const observers = new Map<string, Set<ObserverListener<unknown>>>();
  let disposed = false;

  const reportObserverError = (error: unknown): void => {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
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
    { initialEmit = false }: { initialEmit?: boolean } = {},
  ): (() => void) => {
    if (disposed) {
      throw new Error('[deposit] observer hub is disposed');
    }

    const key = String(table);
    const wrapped = listener as ObserverListener<unknown>;
    let listeners = observers.get(key);

    if (!listeners) {
      listeners = new Set();
      observers.set(key, listeners);
    }

    listeners.add(wrapped);

    if (initialEmit) notify(table);

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

export function getRecordKey<S extends AnySchema, K extends keyof S>(
  schema: S,
  table: K,
  value: RecordOf<S, K>,
): KeyOf<S, K> {
  const keyField = String(schema[table].key);
  const keyValue = (value as Record<string, unknown>)[keyField];

  if (keyValue === undefined || keyValue === null) {
    throw new Error(`[deposit] missing required key field "${keyField}" in record for table "${String(table)}"`);
  }

  return keyValue as KeyOf<S, K>;
}
