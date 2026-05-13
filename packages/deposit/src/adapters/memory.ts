import type { Adapter, AnySchema, KeyOf, RecordOf, TtlMs } from '../types';

import { createAdapterRuntime } from '../adapter-core';
import { type StoredRecord, unwrapStored, wrapStored } from '../ttl';

function getTableStore(tables: Map<string, Map<string, StoredRecord<unknown>>>, table: string) {
  let store = tables.get(table);

  if (!store) {
    store = new Map();
    tables.set(table, store);
  }

  return store;
}

export function createMemory<S extends AnySchema>(schema: S): Adapter<S> {
  const tables = new Map<string, Map<string, StoredRecord<unknown>>>();
  const recordKey = <K extends keyof S>(table: K, value: RecordOf<S, K>): KeyOf<S, K> => {
    const keyField = String(schema[table].key);
    const keyValue = (value as Record<string, unknown>)[keyField];

    if (keyValue === undefined || keyValue === null) {
      throw new Error(`deposit: missing required key field "${keyField}" in record for table "${String(table)}"`);
    }

    return keyValue as KeyOf<S, K>;
  };

  return createAdapterRuntime(schema, {
    async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      return getTableStore(tables, String(table)).delete(String(key));
    },
    async deleteAll<K extends keyof S>(table: K): Promise<number> {
      const store = getTableStore(tables, String(table));
      const deleted = store.size;

      store.clear();

      return deleted;
    },
    async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
      const store = getTableStore(tables, String(table));
      const raw = store.get(String(key));

      if (!raw) return undefined;

      const value = unwrapStored(raw as StoredRecord<RecordOf<S, K>>);

      if (value === undefined) {
        store.delete(String(key));
      }

      return value;
    },
    async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
      const store = getTableStore(tables, String(table));
      const records: RecordOf<S, K>[] = [];
      const expiredKeys: string[] = [];

      for (const [key, raw] of store) {
        const value = unwrapStored(raw as StoredRecord<RecordOf<S, K>>);

        if (value === undefined) {
          expiredKeys.push(key);

          continue;
        }

        records.push(value);
      }

      for (const key of expiredKeys) {
        store.delete(key);
      }

      return records;
    },
    async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void> {
      getTableStore(tables, String(table)).set(String(recordKey(table, value)), wrapStored(value, ttl));
    },
    async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
      const store = getTableStore(tables, String(table));

      for (const value of values) {
        store.set(String(recordKey(table, value)), wrapStored(value, ttl));
      }
    },
  }).adapter;
}
