import type { Adapter, AnySchema, BaseAdapterOptions, KeyOf, RecordOf, TtlMs } from '../types';

import { buildAdapterOps, type StorageBackend } from '../adapter-core';
import { getRecordKey } from '../internal';
import { defaultCodec, type StoredRecord } from '../ttl';

type MemoryBroadcastMsg =
  | { table: string; type: 'clear' }
  | { key: string; table: string; type: 'delete' }
  | { keys: string[]; table: string; type: 'deleteMany' }
  | { key: string; stored: StoredRecord<unknown>; table: string; type: 'put' }
  | { entries: Array<{ key: string; stored: StoredRecord<unknown> }>; table: string; type: 'putAll' };

/** Runtime type guard — rejects malformed or unknown BroadcastChannel messages. */
function makeBroadcastMsgGuard(codec: { decode<T>(raw: unknown): (StoredRecord<T> & { value: T }) | undefined }) {
  return function isBroadcastMsg(data: unknown): data is MemoryBroadcastMsg {
    if (typeof data !== 'object' || data === null) return false;

    const d = data as Record<string, unknown>;

    if (typeof d['table'] !== 'string' || typeof d['type'] !== 'string') return false;

    switch (d['type']) {
      case 'clear':
        return true;
      case 'delete':
        return typeof d['key'] === 'string';
      case 'deleteMany':
        return Array.isArray(d['keys']) && (d['keys'] as unknown[]).every((k) => typeof k === 'string');
      case 'put':
        return typeof d['key'] === 'string' && codec.decode(d['stored']) !== undefined;
      case 'putAll':
        return (
          Array.isArray(d['entries']) &&
          (d['entries'] as unknown[]).every(
            (e) =>
              typeof e === 'object' &&
              e !== null &&
              typeof (e as Record<string, unknown>)['key'] === 'string' &&
              codec.decode((e as Record<string, unknown>)['stored']) !== undefined,
          )
        );
      default:
        return false;
    }
  };
}

type MemoryOptions<S extends AnySchema> = BaseAdapterOptions<S> & {
  /**
   * When provided and BroadcastChannel is available, enables cross-tab state sync.
   * All `createMemory` instances with the same `name` will replicate mutations to each other.
   */
  name?: string;
};

export function createMemory<S extends AnySchema>(options: MemoryOptions<S>): Adapter<S> {
  const { codec = defaultCodec, logger, name, onMetrics, schema, signals, validators } = options;
  const tables = new Map(Object.keys(schema).map((k) => [k, new Map<string, StoredRecord<unknown>>()]));
  const getTableStore = (table: string) => tables.get(table)!;
  const isBroadcastMsg = makeBroadcastMsgGuard(codec);

  const channel =
    name !== undefined && typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(`vault-memory:${name}`)
      : undefined;

  const core: StorageBackend<S> = {
    async clear<K extends keyof S & string>(table: K): Promise<void> {
      getTableStore(table).clear();
      channel?.postMessage({ table, type: 'clear' });
    },

    async count<K extends keyof S & string>(table: K): Promise<number> {
      const store = getTableStore(table);
      let liveCount = 0;
      const expiredKeys: string[] = [];

      for (const [key, raw] of store) {
        const decoded = codec.decode<RecordOf<S, K>>(raw);
        const expired = decoded !== undefined && decoded.expiresAt !== undefined && Date.now() >= decoded.expiresAt;

        if (!decoded || expired) {
          expiredKeys.push(key);
        } else {
          liveCount += 1;
        }
      }

      for (const key of expiredKeys) store.delete(key);

      return liveCount;
    },

    async delete<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      const store = getTableStore(table);
      const raw = store.get(String(key));

      if (!raw) return false;

      const decoded = codec.decode<RecordOf<S, K>>(raw);
      const expired = decoded !== undefined && decoded.expiresAt !== undefined && Date.now() >= decoded.expiresAt;
      const isLive = decoded !== undefined && !expired;

      store.delete(String(key));

      if (isLive) channel?.postMessage({ key: String(key), table, type: 'delete' });

      return isLive;
    },

    async deleteMany<K extends keyof S & string>(table: K, keys: KeyOf<S, K>[]): Promise<number> {
      const store = getTableStore(table);
      const deletedKeys: string[] = [];

      for (const key of keys) {
        const strKey = String(key);
        const raw = store.get(strKey);

        if (raw) {
          const decoded = codec.decode<RecordOf<S, K>>(raw);
          const expired = decoded !== undefined && decoded.expiresAt !== undefined && Date.now() >= decoded.expiresAt;

          if (decoded !== undefined && !expired) deletedKeys.push(strKey);

          store.delete(strKey);
        }
      }

      if (deletedKeys.length > 0) channel?.postMessage({ keys: deletedKeys, table, type: 'deleteMany' });

      return deletedKeys.length;
    },

    dispose: channel ? async () => channel.close() : undefined,

    async get<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
      const store = getTableStore(table);
      const raw = store.get(String(key));

      if (!raw) return undefined;

      const decoded = codec.decode<RecordOf<S, K>>(raw);
      const expired = decoded !== undefined && decoded.expiresAt !== undefined && Date.now() >= decoded.expiresAt;

      if (!decoded || expired) {
        store.delete(String(key));

        return undefined;
      }

      return decoded.value;
    },

    async getAll<K extends keyof S & string>(table: K): Promise<RecordOf<S, K>[]> {
      const store = getTableStore(table);
      const records: RecordOf<S, K>[] = [];
      const expiredKeys: string[] = [];

      for (const [key, raw] of store) {
        const decoded = codec.decode<RecordOf<S, K>>(raw);
        const expired = decoded !== undefined && decoded.expiresAt !== undefined && Date.now() >= decoded.expiresAt;

        if (!decoded || expired) {
          expiredKeys.push(key);
        } else {
          records.push(decoded.value);
        }
      }

      for (const key of expiredKeys) store.delete(key);

      return records;
    },

    async getRawCount<K extends keyof S & string>(table: K): Promise<number> {
      return getTableStore(table).size;
    },

    async has<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      const store = getTableStore(table);
      const raw = store.get(String(key));

      if (!raw) return false;

      const decoded = codec.decode<RecordOf<S, K>>(raw);
      const expired = decoded !== undefined && decoded.expiresAt !== undefined && Date.now() >= decoded.expiresAt;

      if (!decoded || expired) store.delete(String(key));

      return decoded !== undefined && !expired;
    },

    async pruneExpiredInTable<K extends keyof S & string>(table: K): Promise<number> {
      const store = getTableStore(table);
      let pruned = 0;

      for (const [key, raw] of store) {
        const decoded = codec.decode<RecordOf<S, K>>(raw);
        const expired = decoded !== undefined && decoded.expiresAt !== undefined && Date.now() >= decoded.expiresAt;

        if (!decoded || expired) {
          store.delete(key);
          pruned += 1;
        }
      }

      return pruned;
    },

    async put<K extends keyof S & string>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void> {
      const key = String(getRecordKey(schema, table, value));
      const expiresAt = ttl !== undefined ? Date.now() + ttl : undefined;
      const stored = codec.encode(value, expiresAt) as StoredRecord<unknown>;

      getTableStore(table).set(key, stored);
      channel?.postMessage({ key, stored, table, type: 'put' });
    },

    async putAll<K extends keyof S & string>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
      const store = getTableStore(table);
      const entries: Array<{ key: string; stored: StoredRecord<unknown> }> = [];
      const expiresAt = ttl !== undefined ? Date.now() + ttl : undefined;

      for (const value of values) {
        const key = String(getRecordKey(schema, table, value));
        const stored = codec.encode(value, expiresAt) as StoredRecord<unknown>;

        store.set(key, stored);
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
            let msg: MemoryBroadcastMsg;

            try {
              if (!isBroadcastMsg(event.data)) return;

              msg = event.data;
            } catch {
              return;
            }

            const store = tables.get(msg.table);

            if (!store) return;

            const validator = validators?.[msg.table as keyof S];

            const keyField = schema[msg.table as keyof S & string]?.key;

            const applyStoredWithValidation = (key: string, stored: StoredRecord<unknown>): boolean => {
              try {
                const parsed = codec.decode(stored as unknown);

                if (!parsed) return false;

                const rawValue = validator ? validator.parse(parsed.value) : parsed.value;

                // Security: verify the record's own primary key matches the broadcast envelope key.
                // Prevents a rogue same-origin sender from inserting records with mismatched keys.
                if (keyField && String((rawValue as Record<string, unknown>)[keyField]) !== key) return false;

                const validated: StoredRecord<unknown> =
                  parsed.expiresAt !== undefined
                    ? { expiresAt: parsed.expiresAt, value: rawValue }
                    : { value: rawValue };

                store.set(key, validated);

                return true;
              } catch {
                return false;
              }
            };

            switch (msg.type) {
              case 'clear':
                store.clear();
                notify(msg.table as keyof S & string);

                return;
              case 'delete':
                store.delete(msg.key);
                notify(msg.table as keyof S & string);

                return;
              case 'deleteMany':
                for (const key of msg.keys) store.delete(key);
                notify(msg.table as keyof S & string);

                return;
              case 'put':
                if (applyStoredWithValidation(msg.key, msg.stored)) {
                  notify(msg.table as keyof S & string);
                }

                return;
              case 'putAll':
                {
                  let anyApplied = false;

                  for (const { key, stored } of msg.entries) {
                    if (applyStoredWithValidation(key, stored)) anyApplied = true;
                  }

                  if (anyApplied) notify(msg.table as keyof S & string);
                }

                return;
            }
          };

          return () => {
            channel.onmessage = null;
          };
        }
      : undefined,
    onMetrics,
    schema,
    signals,
    validators,
  });
}
