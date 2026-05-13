import type { Adapter, AnySchema, KeyOf, RecordOf, TtlMs } from '../types';

import { createAdapterRuntime } from '../adapter-core';
import { decodeStorageTableFromKey, encodeStorageKey, encodeStorageTablePrefix } from '../internal';
import { parseStored, unwrapStored, wrapStored } from '../ttl';

function createWebStorageAdapter<S extends AnySchema>(
  dbName: string,
  schema: S,
  getStorage: () => Storage,
  storageLabel: string,
): Adapter<S> {
  let storageListener: ((event: StorageEvent) => void) | undefined;

  const storage = (): Storage => {
    try {
      return getStorage();
    } catch {
      throw new Error(
        `deposit: ${storageLabel} is not available in this environment (private browsing or sandboxed iframe?)`,
      );
    }
  };

  const tryGetStorage = (): Storage | undefined => {
    try {
      return getStorage();
    } catch {
      return undefined;
    }
  };

  const writeItem = (storageKey: string, value: unknown): void => {
    try {
      storage().setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error(`deposit: ${storageLabel} quota exceeded while writing record`, { cause: error });
      }

      throw error;
    }
  };

  const storageKeys = (): string[] => {
    const target = storage();
    const keys: string[] = [];

    for (let index = 0; index < target.length; index += 1) {
      const key = target.key(index);

      if (key !== null) keys.push(key);
    }

    return keys;
  };

  const recordKey = <K extends keyof S>(table: K, value: RecordOf<S, K>): KeyOf<S, K> => {
    const keyField = String(schema[table].key);
    const keyValue = (value as Record<string, unknown>)[keyField];

    if (keyValue === undefined || keyValue === null) {
      throw new Error(`deposit: missing required key field "${keyField}" in record for table "${String(table)}"`);
    }

    return keyValue as KeyOf<S, K>;
  };

  const readEntry = <T extends Record<string, unknown>>(
    storageKey: string,
    removeWhenInvalid: boolean,
  ): T | undefined => {
    const raw = storage().getItem(storageKey);

    if (!raw) return undefined;

    try {
      const parsed = parseStored<T>(JSON.parse(raw) as unknown);

      if (!parsed) {
        if (removeWhenInvalid) storage().removeItem(storageKey);

        return undefined;
      }

      const value = unwrapStored(parsed);

      if (value === undefined && removeWhenInvalid) {
        storage().removeItem(storageKey);
      }

      return value;
    } catch {
      if (removeWhenInvalid) storage().removeItem(storageKey);

      return undefined;
    }
  };

  const runtime = createAdapterRuntime(schema, {
    async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      const target = storage();
      const storageKey = encodeStorageKey(dbName, String(table), String(key));
      const exists = target.getItem(storageKey) !== null;

      if (exists) target.removeItem(storageKey);

      return exists;
    },
    async deleteAll<K extends keyof S>(table: K): Promise<number> {
      const target = storage();
      const prefix = encodeStorageTablePrefix(dbName, String(table));
      let deleted = 0;

      // Walk backwards because Storage is a live indexed collection.
      for (let index = target.length - 1; index >= 0; index -= 1) {
        const key = target.key(index);

        if (!key || !key.startsWith(prefix)) continue;

        target.removeItem(key);
        deleted += 1;
      }

      return deleted;
    },
    dispose() {
      if (typeof window !== 'undefined' && storageListener) {
        window.removeEventListener('storage', storageListener);
      }
    },
    async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
      return readEntry<RecordOf<S, K>>(encodeStorageKey(dbName, String(table), String(key)), true);
    },
    async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
      const target = storage();
      const records: RecordOf<S, K>[] = [];
      const expiredKeys: string[] = [];
      const prefix = encodeStorageTablePrefix(dbName, String(table));

      for (const storageKey of storageKeys()) {
        if (!storageKey.startsWith(prefix)) continue;

        const value = readEntry<RecordOf<S, K>>(storageKey, false);

        if (value === undefined) {
          expiredKeys.push(storageKey);

          continue;
        }

        records.push(value);
      }

      for (const storageKey of expiredKeys) {
        target.removeItem(storageKey);
      }

      return records;
    },
    async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void> {
      writeItem(encodeStorageKey(dbName, String(table), String(recordKey(table, value))), wrapStored(value, ttl));
    },
    async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
      for (const value of values) {
        writeItem(encodeStorageKey(dbName, String(table), String(recordKey(table, value))), wrapStored(value, ttl));
      }
    },
  });

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    storageListener = (event: StorageEvent) => {
      const expectedStorage = tryGetStorage();

      if (event.storageArea && expectedStorage && event.storageArea !== expectedStorage) return;

      if (event.key === null) {
        for (const table of Object.keys(schema)) {
          runtime.notify(table as keyof S);
        }

        return;
      }

      const tableName = decodeStorageTableFromKey(dbName, event.key);

      if (tableName) runtime.notify(tableName as keyof S);
    };

    window.addEventListener('storage', storageListener);
  }

  return runtime.adapter;
}

export function createLocalStorage<S extends AnySchema>(dbName: string, schema: S): Adapter<S> {
  return createWebStorageAdapter(
    dbName,
    schema,
    () => (typeof window !== 'undefined' ? window.localStorage : localStorage),
    'localStorage',
  );
}

export function createSessionStorage<S extends AnySchema>(dbName: string, schema: S): Adapter<S> {
  return createWebStorageAdapter(
    dbName,
    schema,
    () => (typeof window !== 'undefined' ? window.sessionStorage : sessionStorage),
    'sessionStorage',
  );
}
