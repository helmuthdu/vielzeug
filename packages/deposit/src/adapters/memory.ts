import type {
  Adapter,
  AnySchema,
  DepositLogger,
  KeyOf,
  MetricsEvent,
  RecordOf,
  TableSignals,
  TableValidators,
  TtlMs,
} from '../types';

import { buildAdapterOps, type StorageBackend } from '../adapter-core';
import { getRecordKey } from '../internal';
import { type StoredRecord, parseStored, unwrapStored, wrapStored } from '../ttl';

type MemoryBroadcastMsg =
  | { table: string; type: 'clear' }
  | { key: string; table: string; type: 'delete' }
  | { keys: string[]; table: string; type: 'deleteMany' }
  | { key: string; stored: StoredRecord<unknown>; table: string; type: 'put' }
  | { entries: Array<{ key: string; stored: StoredRecord<unknown> }>; table: string; type: 'putAll' };

/** Runtime type guard — rejects malformed or unknown BroadcastChannel messages. */
function isBroadcastMsg(data: unknown): data is MemoryBroadcastMsg {
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
      return typeof d['key'] === 'string' && parseStored(d['stored']) !== undefined;
    case 'putAll':
      return (
        Array.isArray(d['entries']) &&
        (d['entries'] as unknown[]).every(
          (e) =>
            typeof e === 'object' &&
            e !== null &&
            typeof (e as Record<string, unknown>)['key'] === 'string' &&
            parseStored((e as Record<string, unknown>)['stored']) !== undefined,
        )
      );
    default:
      return false;
  }
}

type MemoryOptions<S extends AnySchema> = {
  logger?: DepositLogger;
  /**
   * When provided and BroadcastChannel is available, enables cross-tab state sync.
   * All `createMemory` instances with the same `name` will replicate mutations to each other,
   * giving them shared in-memory state without a persistent backing store.
   */
  name?: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  signals?: TableSignals<S>;
  validators?: TableValidators<S>;
};

export function createMemory<S extends AnySchema>(options: MemoryOptions<S>): Adapter<S> {
  const { logger, name, onMetrics, schema, signals, validators } = options;
  // Pre-populate all table stores at construction — schema is fixed, no lazy init needed.
  const tables = new Map(Object.keys(schema).map((k) => [k, new Map<string, StoredRecord<unknown>>()]));
  const getTableStore = (table: string) => tables.get(table)!;

  // BroadcastChannel for cross-tab state sync (only when name is provided).
  // On each mutation the mutating tab broadcasts the raw StoredRecord so receiving tabs
  // can replicate the exact same data (including TTL) without re-serialising.

  const channel =
    name !== undefined && typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(`deposit-memory:${name}`)
      : undefined;

  const core: StorageBackend<S> = {
    async clear<K extends keyof S>(table: K): Promise<void> {
      getTableStore(String(table)).clear();
      channel?.postMessage({ table: String(table), type: 'clear' });
    },

    async count<K extends keyof S>(table: K): Promise<number> {
      const store = getTableStore(String(table));
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
      const store = getTableStore(String(table));
      const raw = store.get(String(key));

      if (!raw) return false;

      const isLive = unwrapStored(raw as StoredRecord<RecordOf<S, K>>) !== undefined;

      store.delete(String(key)); // always clean up the physical entry

      // Only broadcast live deletions — expired cleanup is local maintenance
      if (isLive) channel?.postMessage({ key: String(key), table: String(table), type: 'delete' });

      return isLive;
    },

    async deleteMany<K extends keyof S>(table: K, keys: KeyOf<S, K>[]): Promise<number> {
      const store = getTableStore(String(table));
      const deletedKeys: string[] = [];

      for (const key of keys) {
        const strKey = String(key);
        const raw = store.get(strKey);

        if (raw) {
          // Only count as deleted if the entry is live (not TTL-expired)
          if (unwrapStored(raw as StoredRecord<RecordOf<S, K>>) !== undefined) {
            deletedKeys.push(strKey);
          }

          store.delete(strKey);
        }
      }

      if (deletedKeys.length > 0) channel?.postMessage({ keys: deletedKeys, table: String(table), type: 'deleteMany' });

      return deletedKeys.length;
    },

    dispose: channel ? () => channel.close() : undefined,

    async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
      const store = getTableStore(String(table));
      const raw = store.get(String(key));

      if (!raw) return undefined;

      const value = unwrapStored(raw as StoredRecord<RecordOf<S, K>>);

      if (value === undefined) {
        store.delete(String(key));
      }

      return value;
    },

    async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
      const store = getTableStore(String(table));
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
      return getTableStore(String(table)).size;
    },

    async has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      const store = getTableStore(String(table));
      const raw = store.get(String(key));

      if (!raw) return false;

      if (unwrapStored(raw as StoredRecord<RecordOf<S, K>>) === undefined) {
        store.delete(String(key));

        return false;
      }

      return true;
    },

    async pruneExpiredInTable<K extends keyof S>(table: K): Promise<number> {
      const store = getTableStore(String(table));
      let pruned = 0;

      for (const [key, raw] of store) {
        if (unwrapStored(raw as StoredRecord<RecordOf<S, K>>) === undefined) {
          store.delete(key);
          pruned += 1;
        }
      }

      return pruned;
    },

    async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void> {
      const key = String(getRecordKey(schema, table, value));
      const stored = wrapStored(value, ttl);

      getTableStore(String(table)).set(key, stored);
      channel?.postMessage({ key, stored, table: String(table), type: 'put' });
    },

    async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
      const store = getTableStore(String(table));
      const entries: Array<{ key: string; stored: StoredRecord<unknown> }> = [];

      for (const value of values) {
        const key = String(getRecordKey(schema, table, value));
        const stored = wrapStored(value, ttl);

        store.set(key, stored);
        entries.push({ key, stored });
      }

      if (entries.length > 0) channel?.postMessage({ entries, table: String(table), type: 'putAll' });
    },
  };

  return buildAdapterOps(schema, core, {
    logger,
    onCrossTabMessage: channel
      ? (notify) => {
          channel.onmessage = (event: MessageEvent<unknown>) => {
            if (!isBroadcastMsg(event.data)) return;

            const msg = event.data;
            const store = tables.get(msg.table);

            if (!store) return;

            const validator = validators?.[msg.table as keyof S];

            const applyStoredWithValidation = (key: string, stored: StoredRecord<unknown>): boolean => {
              if (!validator) {
                store.set(key, stored);

                return true;
              }

              try {
                const parsed = parseStored(stored as unknown);

                if (!parsed) return false;

                const validatedValue = validator.parse(parsed.value);
                const validated: StoredRecord<unknown> =
                  parsed.expiresAt !== undefined
                    ? { expiresAt: parsed.expiresAt, value: validatedValue }
                    : { value: validatedValue };

                store.set(key, validated);

                return true;
              } catch {
                return false; // discard invalid record
              }
            };

            switch (msg.type) {
              case 'clear':
                store.clear();
                break;
              case 'delete':
                store.delete(msg.key);
                break;
              case 'deleteMany':
                for (const key of msg.keys) store.delete(key);
                break;
              case 'put':
                applyStoredWithValidation(msg.key, msg.stored);
                break;
              case 'putAll':
                for (const { key, stored } of msg.entries) applyStoredWithValidation(key, stored);
                break;
            }

            notify(msg.table as keyof S);
          };

          return () => {
            channel.onmessage = null;
          };
        }
      : undefined,
    onMetrics,
    signals,
    validators,
  });
}
