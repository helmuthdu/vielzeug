import type { AnySchema, BaseAdapterOptions, KeyOf, RecordOf, VaultStore } from '../types';

import { buildAdapterOps, type StorageBackend } from '../adapter-core';
import { encodeVaultKey, getRecordKey } from '../internal';
import { isExpired, parseStored, type StoredRecord } from '../ttl';

type MemoryBroadcastMsg =
  | { table: string; type: 'clear' }
  | { key: string; table: string; type: 'delete' }
  | { keys: string[]; table: string; type: 'deleteMany' }
  | { key: string; stored: StoredRecord<unknown>; table: string; type: 'put' }
  | { entries: Array<{ key: string; stored: StoredRecord<unknown> }>; table: string; type: 'putAll' };

type MemoryOptions<S extends AnySchema> = BaseAdapterOptions<S> & { name?: string };

function isBroadcastMessage(value: unknown): value is MemoryBroadcastMsg {
  if (typeof value !== 'object' || value === null) return false;

  const message = value as Record<string, unknown>;

  if (typeof message['table'] !== 'string' || typeof message['type'] !== 'string') return false;

  if (message['table'] === '__proto__' || message['table'] === 'constructor' || message['table'] === 'prototype') {
    return false;
  }

  switch (message['type']) {
    case 'clear':
      return true;
    case 'delete':
      return typeof message['key'] === 'string';
    case 'deleteMany':
      return Array.isArray(message['keys']) && message['keys'].every((key) => typeof key === 'string');
    case 'put':
      return typeof message['key'] === 'string' && parseStored(message['stored']) !== undefined;
    case 'putAll':
      return (
        Array.isArray(message['entries']) &&
        message['entries'].every(
          (entry) =>
            typeof entry === 'object' &&
            entry !== null &&
            typeof (entry as Record<string, unknown>)['key'] === 'string' &&
            parseStored((entry as Record<string, unknown>)['stored']) !== undefined,
        )
      );
    default:
      return false;
  }
}

/** Memory uses tagged Map keys so numeric and string primary keys never collide. */
export function createMemory<S extends AnySchema>(options: MemoryOptions<S>): VaultStore<S> {
  const { logger, name, onMetrics, schema, validators } = options;
  const tables = new Map(Object.keys(schema).map((table) => [table, new Map<string, StoredRecord<unknown>>()]));
  const getTable = (table: string): Map<string, StoredRecord<unknown>> => tables.get(table)!;
  const channel =
    name !== undefined && typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(`vault-memory:${name}`)
      : undefined;

  const core: StorageBackend<S> = {
    async clear(table) {
      getTable(table).clear();
      channel?.postMessage({ table, type: 'clear' });
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

      const deleted = record !== undefined && !isExpired(record.expiresAt);

      if (deleted) channel?.postMessage({ key: encodedKey, table, type: 'delete' });

      return deleted;
    },
    async deleteMany(table, keys) {
      let deleted = 0;
      const deletedKeys: string[] = [];

      for (const key of keys) {
        const encodedKey = encodeVaultKey(key);
        const record = parseStored(getTable(table).get(encodedKey));

        getTable(table).delete(encodedKey);

        if (record !== undefined && !isExpired(record.expiresAt)) {
          deleted += 1;
          deletedKeys.push(encodedKey);
        }
      }

      if (deletedKeys.length > 0) channel?.postMessage({ keys: deletedKeys, table, type: 'deleteMany' });

      return deleted;
    },
    dispose: channel ? async () => channel.close() : undefined,
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
    async getRawCount(table) {
      return getTable(table).size;
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
      channel?.postMessage({ key, stored, table, type: 'put' });
    },
    async putAll(table, values, ttl) {
      const expiresAt = ttl === undefined ? undefined : Date.now() + ttl;
      const entries: Array<{ key: string; stored: StoredRecord<unknown> }> = [];

      for (const value of values) {
        const key = encodeVaultKey(getRecordKey(schema, table, value));
        const stored: StoredRecord<unknown> = expiresAt === undefined ? { value } : { expiresAt, value };

        getTable(table).set(key, stored);
        entries.push({ key, stored });
      }

      if (entries.length > 0) channel?.postMessage({ entries, table, type: 'putAll' });
    },
  };

  return buildAdapterOps(schema, core, {
    logger,
    onCrossTabMessage: channel
      ? (notify) => {
          channel.onmessage = (event: MessageEvent<unknown>) => {
            if (!isBroadcastMessage(event.data)) return;

            const message = event.data;

            if (!tables.has(message.table)) return;

            const store = getTable(message.table);
            const validateStored = (key: string, stored: StoredRecord<unknown>): boolean => {
              const parsed = parseStored(stored);
              const keyField = schema[message.table as keyof S & string]?.key;
              const validator = validators?.[message.table as keyof S];

              if (!parsed || !keyField) return false;

              try {
                const value = validator ? validator.parse(parsed.value) : parsed.value;

                if (encodeVaultKey((value as Record<string, unknown>)[keyField] as KeyOf<S, keyof S>) !== key)
                  return false;

                store.set(key, parsed.expiresAt === undefined ? { value } : { expiresAt: parsed.expiresAt, value });

                return true;
              } catch {
                return false;
              }
            };

            switch (message.type) {
              case 'clear':
                store.clear();
                notify(message.table as keyof S & string);
                break;
              case 'delete':
                store.delete(message.key);
                notify(message.table as keyof S & string);
                break;
              case 'deleteMany':
                for (const key of message.keys) store.delete(key);
                notify(message.table as keyof S & string);
                break;
              case 'put':
                if (validateStored(message.key, message.stored)) notify(message.table as keyof S & string);

                break;
              case 'putAll':
                if (message.entries.some((entry) => validateStored(entry.key, entry.stored))) {
                  notify(message.table as keyof S & string);
                }

                break;
            }
          };

          return () => {
            channel.onmessage = null;
          };
        }
      : undefined,
    onMetrics,
    schema,
    validators,
  });
}
