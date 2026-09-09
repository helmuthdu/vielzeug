import { buildKeyValueStore, type StorageBackend } from '../adapter-core';
import { encodeVaultKey, getRecordKey } from '../internal';
import { isExpired, parseStored, type StoredRecord } from '../ttl';
import type { AnySchema, KeyValueVaultStore, MemoryStoreOptions, RecordOf } from '../types';

/** Memory uses tagged Map keys so numeric and string primary keys never collide. */
export function createMemory<S extends AnySchema>(options: MemoryStoreOptions<S>): KeyValueVaultStore<S> {
  const { schema } = options;
  const tables = new Map(Object.keys(schema).map((table) => [table, new Map<string, StoredRecord<unknown>>()]));
  const getTable = (table: string): Map<string, StoredRecord<unknown>> => tables.get(table)!;

  const core: StorageBackend<S> = {
    async clear(table) {
      getTable(table).clear();
    },
    async delete(table, key) {
      const store = getTable(table);
      const encodedKey = encodeVaultKey(key);
      const record = parseStored(store.get(encodedKey));

      store.delete(encodedKey);

      return record !== undefined && !isExpired(record.expiresAt);
    },
    async get(table, key) {
      const store = getTable(table);
      const encodedKey = encodeVaultKey(key);
      const record = parseStored<RecordOf<S, typeof table>>(store.get(encodedKey));

      if (!record || isExpired(record.expiresAt)) {
        store.delete(encodedKey);

        return undefined;
      }

      return record.value;
    },
    async getAll(table) {
      const store = getTable(table);
      const values: RecordOf<S, typeof table>[] = [];

      for (const [key, stored] of store) {
        const record = parseStored<RecordOf<S, typeof table>>(stored);

        if (!record || isExpired(record.expiresAt)) store.delete(key);
        else values.push(record.value);
      }

      return values;
    },
    async pruneExpiredInTable(table) {
      const store = getTable(table);
      let pruned = 0;

      for (const [key, stored] of store) {
        const record = parseStored(stored);

        if (!record || isExpired(record.expiresAt)) {
          store.delete(key);
          pruned += 1;
        }
      }

      return pruned;
    },
    async put(table, value, ttl) {
      const key = encodeVaultKey(getRecordKey(schema, table, value));
      const stored: StoredRecord<unknown> = ttl === undefined ? { value } : { expiresAt: Date.now() + ttl, value };

      getTable(table).set(key, stored);
    },
    async putAll(table, values, ttl) {
      const expiresAt = ttl === undefined ? undefined : Date.now() + ttl;

      for (const value of values) {
        const key = encodeVaultKey(getRecordKey(schema, table, value));
        const stored: StoredRecord<unknown> = expiresAt === undefined ? { value } : { expiresAt, value };

        getTable(table).set(key, stored);
      }
    },
  };

  return buildKeyValueStore(schema, core, options);
}
