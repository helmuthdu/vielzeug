import type { Adapter, AnySchema, BaseAdapterOptions, KeyOf, RecordOf, TtlMs } from '../types';

import { buildAdapterOps, type StorageBackend } from '../adapter-core';
import { VaultQuotaError } from '../errors';
import {
  decodeStorageTableFromKey,
  encodeDbPrefix,
  encodeStorageKey,
  encodeStorageTablePrefix,
  getRecordKey,
} from '../internal';
import { readWithTtl, wrapStored } from '../ttl';

// Firefox historically threw 'NS_ERROR_DOM_QUOTA_REACHED'; modern browsers use the standard name.
const QUOTA_ERROR_NAMES = new Set(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED']);

type WebStorageOptions<S extends AnySchema> = BaseAdapterOptions<S> & {
  name: string;
  /**
   * Called when localStorage/sessionStorage quota is exceeded on a write.
   * Return `'ignore'` to silently drop the write, or `'throw'` (default) to rethrow the error.
   */
  onQuotaExceeded?: (table: keyof S, error: VaultQuotaError) => 'ignore' | 'throw';
};

function createWebStorageAdapter<S extends AnySchema>(
  options: WebStorageOptions<S> & {
    getStorage: () => Storage;
    storageLabel: string;
  },
): Adapter<S> {
  const { getStorage, logger, name, onMetrics, onQuotaExceeded, schema, signals, storageLabel, validators } = options;

  const storage = (): Storage => {
    try {
      return getStorage();
    } catch {
      throw new Error(
        `[vault] ${storageLabel} is not available in this environment (private browsing or sandboxed iframe?)`,
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

  const prefixMap = new Map(Object.keys(schema).map((table) => [table, encodeStorageTablePrefix(name, table)]));
  const getPrefix = (table: string): string => {
    const cached = prefixMap.get(table);

    if (!cached) throw new Error(`[vault] table "${table}" not in schema`);

    return cached;
  };

  const writeItem = (table: keyof S, storageKey: string, value: unknown): void => {
    try {
      storage().setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      if (error instanceof DOMException && QUOTA_ERROR_NAMES.has(error.name)) {
        const wrappedError = new VaultQuotaError(`${storageLabel} quota exceeded while writing record`, {
          cause: error,
        });

        if (onQuotaExceeded?.(table, wrappedError) === 'ignore') return;

        throw wrappedError;
      }

      throw error;
    }
  };

  // Per-instance registry of all storage keys owned by this adapter instance.
  // Populated once at construction; kept current by every mutation.
  const ownedKeys = new Set<string>();

  const initOwnedKeys = (): void => {
    const target = tryGetStorage();

    if (!target) return;

    const dbPrefix = encodeDbPrefix(name);

    for (let i = 0; i < target.length; i++) {
      const key = target.key(i);

      if (key !== null && key.startsWith(dbPrefix)) ownedKeys.add(key);
    }
  };

  initOwnedKeys();

  /**
   * Reads a single entry. Returns the live value, or `undefined` if missing/expired/corrupt.
   *
   * `cleanup: true` (default) immediately removes the storage key and evicts from `ownedKeys`
   * on any non-live result. Pass `cleanup: false` for batch scans (`count`, `getAll`) where
   * the caller collects stale keys and evicts them after iteration to avoid mutating `ownedKeys`
   * mid-loop.
   */
  const readEntry = <T extends Record<string, unknown>>(
    storageKey: string,
    { cleanup = true }: { cleanup?: boolean } = {},
  ): T | undefined => {
    const raw = storage().getItem(storageKey);

    if (!raw) return undefined;

    try {
      const { expired, found, value } = readWithTtl<T>(JSON.parse(raw) as unknown);

      if (!found || expired) {
        if (cleanup) {
          storage().removeItem(storageKey);
          ownedKeys.delete(storageKey);
        }

        return undefined;
      }

      return value;
    } catch {
      // JSON parse failure — always treat as stale.
      if (cleanup) {
        storage().removeItem(storageKey);
        ownedKeys.delete(storageKey);
      }

      return undefined;
    }
  };

  const core: StorageBackend<S> = {
    async clear<K extends keyof S>(table: K): Promise<void> {
      const target = storage();
      const prefix = getPrefix(String(table));
      const toRemove: string[] = [];

      for (const key of ownedKeys) {
        if (key.startsWith(prefix)) toRemove.push(key);
      }

      for (const key of toRemove) {
        target.removeItem(key);
        ownedKeys.delete(key);
      }
    },

    async count<K extends keyof S>(table: K): Promise<number> {
      const target = storage();
      const prefix = getPrefix(String(table));
      const expiredKeys: string[] = [];
      let liveCount = 0;

      for (const storageKey of ownedKeys) {
        if (!storageKey.startsWith(prefix)) continue;

        const value = readEntry<RecordOf<S, K>>(storageKey, { cleanup: false });

        if (value === undefined) {
          expiredKeys.push(storageKey);
        } else {
          liveCount += 1;
        }
      }

      for (const storageKey of expiredKeys) {
        target.removeItem(storageKey);
        ownedKeys.delete(storageKey);
      }

      return liveCount;
    },

    async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      const storageKey = encodeStorageKey(name, String(table), String(key));
      const value = readEntry<RecordOf<S, K>>(storageKey);

      if (value !== undefined) {
        storage().removeItem(storageKey);
        ownedKeys.delete(storageKey);

        return true;
      }

      return false;
    },

    async deleteMany<K extends keyof S>(table: K, keys: KeyOf<S, K>[]): Promise<number> {
      let deleted = 0;

      for (const key of keys) {
        const storageKey = encodeStorageKey(name, String(table), String(key));
        const value = readEntry<RecordOf<S, K>>(storageKey);

        if (value !== undefined) {
          storage().removeItem(storageKey);
          ownedKeys.delete(storageKey);
          deleted += 1;
        }
      }

      return deleted;
    },

    async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
      return readEntry<RecordOf<S, K>>(encodeStorageKey(name, String(table), String(key)));
    },

    async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
      const target = storage();
      const records: RecordOf<S, K>[] = [];
      const expiredKeys: string[] = [];
      const prefix = getPrefix(String(table));

      for (const storageKey of ownedKeys) {
        if (!storageKey.startsWith(prefix)) continue;

        const value = readEntry<RecordOf<S, K>>(storageKey, { cleanup: false });

        if (value === undefined) {
          expiredKeys.push(storageKey);
          continue;
        }

        records.push(value);
      }

      for (const storageKey of expiredKeys) {
        target.removeItem(storageKey);
        ownedKeys.delete(storageKey);
      }

      return records;
    },

    async getRawCount<K extends keyof S>(table: K): Promise<number> {
      const prefix = getPrefix(String(table));
      let count = 0;

      for (const key of ownedKeys) {
        if (key.startsWith(prefix)) count += 1;
      }

      return count;
    },

    async has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      return readEntry<RecordOf<S, K>>(encodeStorageKey(name, String(table), String(key))) !== undefined;
    },

    async pruneExpiredInTable<K extends keyof S>(table: K): Promise<number> {
      const target = storage();
      const prefix = getPrefix(String(table));
      const expiredKeys: string[] = [];

      for (const storageKey of ownedKeys) {
        if (!storageKey.startsWith(prefix)) continue;

        const raw = target.getItem(storageKey);

        if (raw === null) {
          expiredKeys.push(storageKey);
          continue;
        }

        try {
          const { expired, found } = readWithTtl(JSON.parse(raw) as unknown);

          if (!found || expired) expiredKeys.push(storageKey);
        } catch {
          expiredKeys.push(storageKey);
        }
      }

      for (const storageKey of expiredKeys) {
        target.removeItem(storageKey);
        ownedKeys.delete(storageKey);
      }

      return expiredKeys.length;
    },

    async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void> {
      const storageKey = encodeStorageKey(name, String(table), String(getRecordKey(schema, table, value)));

      writeItem(table, storageKey, wrapStored(value, ttl));
      ownedKeys.add(storageKey);
    },

    async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
      for (const value of values) {
        const storageKey = encodeStorageKey(name, String(table), String(getRecordKey(schema, table, value)));

        writeItem(table, storageKey, wrapStored(value, ttl));
        ownedKeys.add(storageKey);
      }
    },
  };

  return buildAdapterOps(schema, core, {
    logger,
    onCrossTabMessage(notify) {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
        return undefined;
      }

      const listener = (event: StorageEvent) => {
        const expectedStorage = tryGetStorage();

        if (event.storageArea && expectedStorage && event.storageArea !== expectedStorage) return;

        if (event.key === null) {
          // storage.clear() from another tab — all keys are gone; purge ownedKeys
          ownedKeys.clear();

          for (const table of Object.keys(schema)) {
            notify(table as keyof S);
          }

          return;
        }

        const tableName = decodeStorageTableFromKey(name, event.key);

        if (tableName && tableName in schema) {
          if (event.newValue === null) {
            ownedKeys.delete(event.key);
          } else {
            ownedKeys.add(event.key);
          }

          notify(tableName as keyof S);
        }
      };

      window.addEventListener('storage', listener);

      return () => window.removeEventListener('storage', listener);
    },
    onMetrics,
    schema,
    signals,
    validators,
  });
}

export function createLocalStorage<S extends AnySchema>(options: WebStorageOptions<S>): Adapter<S> {
  return createWebStorageAdapter({
    ...options,
    getStorage: () => (typeof window !== 'undefined' ? window.localStorage : localStorage),
    storageLabel: 'localStorage',
  });
}

export function createSessionStorage<S extends AnySchema>(options: WebStorageOptions<S>): Adapter<S> {
  return createWebStorageAdapter({
    ...options,
    getStorage: () => (typeof window !== 'undefined' ? window.sessionStorage : sessionStorage),
    storageLabel: 'sessionStorage',
  });
}
