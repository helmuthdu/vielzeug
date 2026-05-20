import type { DepositLogger, TableValidators } from '../plugins';
import type { Adapter, AnySchema, KeyOf, MetricsEvent, RecordOf, TtlMs } from '../types';

import { buildAdapterOps, type CoreRuntimeOps } from '../adapter-core';
import { getRecordKey } from '../internal';
import { type StoredRecord, unwrapStored, wrapStored } from '../ttl';

type MemoryOptions<S extends AnySchema> = {
  logger?: DepositLogger;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  validators?: TableValidators<S>;
};

function getTableStore(tables: Map<string, Map<string, StoredRecord<unknown>>>, table: string) {
  let store = tables.get(table);

  if (!store) {
    store = new Map();
    tables.set(table, store);
  }

  return store;
}

export function createMemory<S extends AnySchema>(options: MemoryOptions<S>): Adapter<S> {
  const { logger, onMetrics, schema, validators } = options;
  const tables = new Map<string, Map<string, StoredRecord<unknown>>>();

  const core: CoreRuntimeOps<S> = {
    async clear<K extends keyof S>(table: K): Promise<number> {
      const store = getTableStore(tables, String(table));
      const count = store.size;

      store.clear();

      return count;
    },

    async count<K extends keyof S>(table: K): Promise<number> {
      const store = getTableStore(tables, String(table));
      let liveCount = 0;
      const expiredKeys: string[] = [];

      for (const [key, raw] of store) {
        if (unwrapStored(raw as StoredRecord<RecordOf<S, K>>) === undefined) {
          expiredKeys.push(key);
        } else {
          liveCount += 1;
        }
      }

      for (const key of expiredKeys) {
        store.delete(key);
      }

      return liveCount;
    },

    async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      return getTableStore(tables, String(table)).delete(String(key));
    },

    async deleteMany<K extends keyof S>(table: K, keys: KeyOf<S, K>[]): Promise<number> {
      const store = getTableStore(tables, String(table));
      let deleted = 0;

      for (const key of keys) {
        if (store.delete(String(key))) deleted += 1;
      }

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

    async getRawCount<K extends keyof S>(table: K): Promise<number> {
      return getTableStore(tables, String(table)).size;
    },

    async has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      const store = getTableStore(tables, String(table));
      const raw = store.get(String(key));

      if (!raw) return false;

      if (unwrapStored(raw as StoredRecord<RecordOf<S, K>>) === undefined) {
        store.delete(String(key));

        return false;
      }

      return true;
    },

    async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void> {
      getTableStore(tables, String(table)).set(String(getRecordKey(schema, table, value)), wrapStored(value, ttl));
    },

    async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
      const store = getTableStore(tables, String(table));

      for (const value of values) {
        store.set(String(getRecordKey(schema, table, value)), wrapStored(value, ttl));
      }
    },
  };

  const { adapter } = buildAdapterOps(schema, core, { logger, onMetrics, validators });

  return adapter;
}
