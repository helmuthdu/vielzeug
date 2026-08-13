import { error as logError } from './_dev';
import { VaultDisposedError, VaultError } from './errors';
import type { AnySchema, KeyOf, RecordOf, VaultKey } from './types';

type ObserverListener<T> = (records: T[]) => void;

const SEP = '\x00';

/**
 * Type-tagged keys make `1` and `'1'` distinct in string-keyed adapters while
 * keeping the same portable primary-key contract as IndexedDB.
 */
export function encodeVaultKey(key: VaultKey): string {
  if (typeof key === 'number') {
    if (!Number.isFinite(key)) throw new VaultError(`primary key must be a finite number, received ${String(key)}`);

    return `n:${String(key)}`;
  }

  return `s:${encodeURIComponent(key)}`;
}

export function encodeDbPrefix(dbName: string): string {
  return `${encodeURIComponent(dbName)}${SEP}`;
}

export function encodeStorageKey(dbName: string, table: string, key: VaultKey): string {
  return `${encodeURIComponent(dbName)}${SEP}${encodeURIComponent(table)}${SEP}${encodeVaultKey(key)}`;
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

/** `observe()` is Vault's single reactivity primitive: a snapshot now, then on mutations. */
export function createObserverHub<S extends AnySchema>(
  getAll: <K extends keyof S & string>(table: K) => Promise<RecordOf<S, K>[]>,
  onError?: (error: unknown) => void,
) {
  const observers = new Map<string, Set<ObserverListener<unknown>>>();
  let disposed = false;

  const reportObserverError = (error: unknown): void => {
    if (onError) onError(error);
    else logError('observer notification failed', error);
  };

  const notify = <K extends keyof S & string>(table: K): void => {
    if (disposed) return;

    const listeners = observers.get(table);

    if (!listeners || listeners.size === 0) return;

    void getAll(table)
      .then((records) => {
        if (disposed) return;

        const current = observers.get(table);

        if (!current || current.size === 0) return;

        for (const listener of current) {
          try {
            listener(records as unknown[]);
          } catch (error) {
            reportObserverError(error);
          }
        }
      })
      .catch(reportObserverError);
  };

  const observe = <K extends keyof S & string>(
    table: K,
    listener: (records: RecordOf<S, K>[]) => void,
    { immediate = true, signal }: { immediate?: boolean; signal?: AbortSignal } = {},
  ): (() => void) => {
    if (disposed) throw new VaultDisposedError('observer hub is disposed');

    if (signal?.aborted) return () => {};

    const wrapped = listener as ObserverListener<unknown>;
    const listeners = observers.get(table) ?? new Set<ObserverListener<unknown>>();

    observers.set(table, listeners);
    listeners.add(wrapped);

    if (immediate) notify(table);

    const stop = (): void => {
      const current = observers.get(table);

      if (!current) return;

      current.delete(wrapped);

      if (current.size === 0) observers.delete(table);
    };

    signal?.addEventListener('abort', stop, { once: true });

    return stop;
  };

  return {
    dispose: () => {
      disposed = true;
      observers.clear();
    },
    notify,
    observe,
  };
}

export function getRecordKey<S extends AnySchema, K extends keyof S>(
  schema: S,
  table: K,
  value: RecordOf<S, K>,
): KeyOf<S, K> {
  const keyField = String(schema[table].key);
  const keyValue = (value as Record<string, unknown>)[keyField];

  if (typeof keyValue !== 'number' && typeof keyValue !== 'string') {
    throw new VaultError(`record in table "${String(table)}" must have a string or finite-number key at "${keyField}"`);
  }

  if (typeof keyValue === 'number' && !Number.isFinite(keyValue)) {
    throw new VaultError(`record in table "${String(table)}" must have a finite-number key at "${keyField}"`);
  }

  return keyValue as KeyOf<S, K>;
}
