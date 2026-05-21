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
import { DepositQuotaError } from '../errors';
import {
  decodeStorageTableFromKey,
  encodeDbPrefix,
  encodeStorageKey,
  encodeStorageTablePrefix,
  getRecordKey,
} from '../internal';
import { parseStored, unwrapStored, wrapStored } from '../ttl';

// Firefox historically threw 'NS_ERROR_DOM_QUOTA_REACHED'; modern browsers use the standard name.
const QUOTA_ERROR_NAMES = new Set(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED']);

type WebStorageOptions<S extends AnySchema> = {
  logger?: DepositLogger;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  /**
   * Called when localStorage/sessionStorage quota is exceeded on a write.
   * Return `'ignore'` to silently drop the write, or `'throw'` (default) to rethrow the error.
   */
  onQuotaExceeded?: (table: keyof S, error: DepositQuotaError) => 'ignore' | 'throw';
  schema: S;
  signals?: TableSignals<S>;
  validators?: TableValidators<S>;
};

function createWebStorageAdapter<S extends AnySchema>(options: {
  getStorage: () => Storage;
  logger?: DepositLogger;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  onQuotaExceeded?: (table: keyof S, error: DepositQuotaError) => 'ignore' | 'throw';
  schema: S;
  signals?: TableSignals<S>;
  storageLabel: string;
  validators?: TableValidators<S>;
}): Adapter<S> {
  const { getStorage, logger, name, onMetrics, onQuotaExceeded, schema, signals, storageLabel, validators } = options;

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

  const writeItem = (table: keyof S, storageKey: string, value: unknown): void => {
    try {
      storage().setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      if (error instanceof DOMException && QUOTA_ERROR_NAMES.has(error.name)) {
        const wrappedError = new DepositQuotaError(`${storageLabel} quota exceeded while writing record`, {
          cause: error,
        });

        if (onQuotaExceeded?.(table, wrappedError) === 'ignore') return;

        throw wrappedError;
      }

      throw error;
    }
  };

  // Per-instance registry of all storage keys owned by this adapter instance.
  // Populated once at construction via a one-time scan; kept current by every mutation.
  // Enables count/getAll/clear/prune to iterate only owned keys (O(owned)) rather than
  // scanning the full WebStorage key list (O(all keys in storage)).
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

  /** Reads, parses, and optionally cleans up expired/corrupt entries on miss. */
  const readEntry = <T extends Record<string, unknown>>(
    storageKey: string,
    { remove = true }: { remove?: boolean } = {},
  ): T | undefined => {
    const raw = storage().getItem(storageKey);

    if (!raw) return undefined;

    try {
      const parsed = parseStored<T>(JSON.parse(raw) as unknown);

      if (!parsed) {
        if (remove) {
          storage().removeItem(storageKey);
          ownedKeys.delete(storageKey);
        }

        return undefined;
      }

      const value = unwrapStored(parsed);

      if (value === undefined && remove) {
        storage().removeItem(storageKey);
        ownedKeys.delete(storageKey);
      }

      return value;
    } catch {
      if (remove) {
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

        const value = readEntry<RecordOf<S, K>>(storageKey, { remove: false });

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

      // readEntry cleaned up expired/corrupt entries and synced ownedKeys.
      // For live entries, remove the physical entry and sync ownedKeys here.
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

        const value = readEntry<RecordOf<S, K>>(storageKey, { remove: false });

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

        // Key is in ownedKeys but physically absent (e.g. removed outside the adapter)
        if (raw === null) {
          expiredKeys.push(storageKey);
          continue;
        }

        try {
          const parsed = parseStored(JSON.parse(raw) as unknown);

          if (!parsed || unwrapStored(parsed) === undefined) {
            expiredKeys.push(storageKey);
          }
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

      // writeItem first: if it throws (quota exceeded), ownedKeys must not be polluted
      // with a key that was never physically written.
      writeItem(table, storageKey, wrapStored(value, ttl));
      ownedKeys.add(storageKey);
    },

    async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
      for (const value of values) {
        const storageKey = encodeStorageKey(name, String(table), String(getRecordKey(schema, table, value)));

        // writeItem first: if it throws mid-batch (quota), we stop here and only
        // the keys that were successfully written remain in ownedKeys.
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
          // Keep ownedKeys in sync with cross-tab writes and deletes.
          // Only accept keys for tables that exist in our schema to prevent unbounded growth.
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
