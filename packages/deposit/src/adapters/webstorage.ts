import type { DepositLogger, TableValidators } from '../plugins';
import type { Adapter, AnySchema, KeyOf, MetricsEvent, RecordOf, TtlMs } from '../types';

import { buildAdapterOps, type CoreRuntimeOps } from '../adapter-core';
import { decodeStorageTableFromKey, encodeStorageKey, encodeStorageTablePrefix, getRecordKey } from '../internal';
import { parseStored, unwrapStored, wrapStored } from '../ttl';

type WebStorageOptions<S extends AnySchema> = {
  logger?: DepositLogger;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  validators?: TableValidators<S>;
};

function createWebStorageAdapter<S extends AnySchema>(options: {
  getStorage: () => Storage;
  logger?: DepositLogger;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  storageLabel: string;
  validators?: TableValidators<S>;
}): Adapter<S> {
  const { getStorage, logger, name, onMetrics, schema, storageLabel, validators } = options;
  let storageListener: ((event: StorageEvent) => void) | undefined;

  const storage = (): Storage => {
    try {
      return getStorage();
    } catch {
      throw new Error(
        `[deposit] ${storageLabel} is not available in this environment (private browsing or sandboxed iframe?)`,
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

  // Precompute table prefixes once to avoid repeated encodeURIComponent calls
  const prefixMap = new Map(Object.keys(schema).map((table) => [table, encodeStorageTablePrefix(name, table)]));
  const getPrefix = (table: string): string => {
    const cached = prefixMap.get(table);

    if (!cached) throw new Error(`[deposit] table "${table}" not in schema`);

    return cached;
  };

  const writeItem = (storageKey: string, value: unknown): void => {
    try {
      storage().setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error(`[deposit] ${storageLabel} quota exceeded while writing record`, { cause: error });
      }

      throw error;
    }
  };

  const storageKeys = (): string[] => {
    const target = storage();
    const keys: string[] = [];

    for (let i = 0; i < target.length; i += 1) {
      const key = target.key(i);

      if (key !== null) keys.push(key);
    }

    return keys;
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

  const core: CoreRuntimeOps<S> = {
    async clear<K extends keyof S>(table: K): Promise<number> {
      const target = storage();
      const prefix = getPrefix(String(table));
      const toRemove: string[] = [];

      // Collect first to avoid mutating a live indexed collection during iteration
      for (const key of storageKeys()) {
        if (key.startsWith(prefix)) toRemove.push(key);
      }

      for (const key of toRemove) {
        target.removeItem(key);
      }

      return toRemove.length;
    },

    async count<K extends keyof S>(table: K): Promise<number> {
      const target = storage();
      const prefix = getPrefix(String(table));
      const expiredKeys: string[] = [];
      let liveCount = 0;

      for (const storageKey of storageKeys()) {
        if (!storageKey.startsWith(prefix)) continue;

        const value = readEntry<RecordOf<S, K>>(storageKey, false);

        if (value === undefined) {
          expiredKeys.push(storageKey);
        } else {
          liveCount += 1;
        }
      }

      for (const storageKey of expiredKeys) {
        target.removeItem(storageKey);
      }

      return liveCount;
    },

    async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      const target = storage();
      const storageKey = encodeStorageKey(name, String(table), String(key));
      const exists = target.getItem(storageKey) !== null;

      if (exists) target.removeItem(storageKey);

      return exists;
    },

    async deleteMany<K extends keyof S>(table: K, keys: KeyOf<S, K>[]): Promise<number> {
      const target = storage();
      let deleted = 0;

      for (const key of keys) {
        const storageKey = encodeStorageKey(name, String(table), String(key));

        if (target.getItem(storageKey) !== null) {
          target.removeItem(storageKey);
          deleted += 1;
        }
      }

      return deleted;
    },

    async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
      return readEntry<RecordOf<S, K>>(encodeStorageKey(name, String(table), String(key)), true);
    },

    async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
      const target = storage();
      const records: RecordOf<S, K>[] = [];
      const expiredKeys: string[] = [];
      const prefix = getPrefix(String(table));

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

    async getRawCount<K extends keyof S>(table: K): Promise<number> {
      const prefix = getPrefix(String(table));
      let count = 0;

      for (const key of storageKeys()) {
        if (key.startsWith(prefix)) count += 1;
      }

      return count;
    },

    async has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      return readEntry<RecordOf<S, K>>(encodeStorageKey(name, String(table), String(key)), true) !== undefined;
    },

    async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void> {
      writeItem(
        encodeStorageKey(name, String(table), String(getRecordKey(schema, table, value))),
        wrapStored(value, ttl),
      );
    },

    async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
      for (const value of values) {
        writeItem(
          encodeStorageKey(name, String(table), String(getRecordKey(schema, table, value))),
          wrapStored(value, ttl),
        );
      }
    },
  };

  return buildAdapterOps(schema, core, {
    connectExternal(notify) {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
        return undefined;
      }

      storageListener = (event: StorageEvent) => {
        const expectedStorage = tryGetStorage();

        if (event.storageArea && expectedStorage && event.storageArea !== expectedStorage) return;

        if (event.key === null) {
          for (const table of Object.keys(schema)) {
            notify(table as keyof S);
          }

          return;
        }

        const tableName = decodeStorageTableFromKey(name, event.key);

        if (tableName) {
          notify(tableName as keyof S);
        }
      };

      window.addEventListener('storage', storageListener);

      return () => {
        if (storageListener) {
          window.removeEventListener('storage', storageListener);
        }
      };
    },
    logger,
    onMetrics,
    validators,
  }).adapter;
}

export function createLocalStorage<S extends AnySchema>(options: WebStorageOptions<S>): Adapter<S> {
  return createWebStorageAdapter({
    getStorage: () => (typeof window !== 'undefined' ? window.localStorage : localStorage),
    logger: options.logger,
    name: options.name,
    onMetrics: options.onMetrics,
    schema: options.schema,
    storageLabel: 'localStorage',
    validators: options.validators,
  });
}

export function createSessionStorage<S extends AnySchema>(options: WebStorageOptions<S>): Adapter<S> {
  return createWebStorageAdapter({
    getStorage: () => (typeof window !== 'undefined' ? window.sessionStorage : sessionStorage),
    logger: options.logger,
    name: options.name,
    onMetrics: options.onMetrics,
    schema: options.schema,
    storageLabel: 'sessionStorage',
    validators: options.validators,
  });
}
