import { buildAdapterOps, type StorageBackend } from '../adapter-core';
import { encodeVaultKey, getRecordKey } from '../internal';
import { isExpired, parseStored, type StoredRecord } from '../ttl';
import type { AnySchema, BaseAdapterOptions, RecordOf, VaultStore } from '../types';

type MemoryOptions<S extends AnySchema> = BaseAdapterOptions<S>;

/** Memory uses tagged Map keys so numeric and string primary keys never collide. */
export function createMemory<S extends AnySchema>(options: MemoryOptions<S>): VaultStore<S> {
  const { schema } = options;
  const tables = new Map(Object.keys(schema).map((table) => [table, new Map<string, StoredRecord<unknown>>()]));
  const getTable = (table: string): Map<string, StoredRecord<unknown>> => tables.get(table)!;

  const core: StorageBackend<S> = {
    async clear(table) {
      getTable(table).clear();
    },
    async count(table) {
      const store = getTable(table);
      let count = 0;

      for (const [key, stored] of store) {
        const record = parseStored(stored);

        if (!record || isExpired(record.expiresAt)) store.delete(key);
        else count += 1;
      }

      return count;
    },
    async delete(table, key) {
      const store = getTable(table);
      const encodedKey = encodeVaultKey(key);
      const record = parseStored(store.get(encodedKey));

      store.delete(encodedKey);

      return record !== undefined && !isExpired(record.expiresAt);
    },
    async deleteMany(table, keys) {
      let deleted = 0;

      for (const key of keys) {
        const encodedKey = encodeVaultKey(key);
        const record = parseStored(getTable(table).get(encodedKey));

        getTable(table).delete(encodedKey);

        if (record !== undefined && !isExpired(record.expiresAt)) deleted += 1;
      }

      return deleted;
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
    async has(table, key) {
      return (await core.get(table, key)) !== undefined;
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

  return buildAdapterOps(schema, core, { schema, validators: options.validators });
}
