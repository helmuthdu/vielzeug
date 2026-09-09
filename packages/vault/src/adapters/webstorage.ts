import { buildKeyValueStore, type StorageBackend } from '../adapter-core';
import { decodeRecord, encodeRecord } from '../codec';
import { VaultError, VaultQuotaError } from '../errors';
import {
  decodeStorageTableFromKey,
  encodeDbPrefix,
  encodeStorageKey,
  encodeStorageTablePrefix,
  getRecordKey,
} from '../internal';
import { isExpired, parseStored, type StoredRecord } from '../ttl';
import type { AnySchema, DurableStoreOptions, KeyOf, KeyValueVaultStore, RecordOf } from '../types';

// Firefox historically threw 'NS_ERROR_DOM_QUOTA_REACHED'; modern browsers use the standard name.
const QUOTA_ERROR_NAMES = new Set(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED']);

type WebStorageOptions<S extends AnySchema> = DurableStoreOptions<S> & {
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
): KeyValueVaultStore<S> {
  const { getStorage, name, onQuotaExceeded, schema, storageLabel, codecs } = options;

  if (!codecs) {
    throw new VaultError(`${storageLabel} requires codecs for durable persistence`);
  }

  let resolvedStorage: Storage;

  try {
    resolvedStorage = getStorage();
  } catch (cause) {
    throw new VaultError(
      `${storageLabel} is not available in this environment (private browsing or sandboxed iframe?)`,
      {
        cause,
      },
    );
  }

  const storage = (): Storage => resolvedStorage;

  const prefixMap = new Map(Object.keys(schema).map((table) => [table, encodeStorageTablePrefix(name, table)]));
  const getPrefix = (table: string): string => {
    const cached = prefixMap.get(table);

    if (!cached) throw new VaultError(`table "${table}" not in schema`);

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

  // Per-instance registry of storage keys owned by this namespace.
  // Table-wide operations resynchronize it so same-window adapters stay consistent.
  const ownedKeys = new Set<string>();

  const syncOwnedKeys = (): void => {
    const dbPrefix = encodeDbPrefix(name);
    ownedKeys.clear();

    for (let i = 0; i < resolvedStorage.length; i++) {
      const key = resolvedStorage.key(i);

      if (key?.startsWith(dbPrefix)) ownedKeys.add(key);
    }
  };

  syncOwnedKeys();

  /**
   * Reads a single entry without side effects. Returns the decoded live value,
   * or `undefined` if missing/expired/corrupt.
   *
   * Callers that want to evict stale entries must call `evict(storageKey)` explicitly.
   */
  const parseEntry = <T extends object>(table: keyof S, storageKey: string): T | undefined => {
    const raw = storage().getItem(storageKey);

    if (!raw) return undefined;

    let stored: StoredRecord<unknown> | undefined;
    try {
      stored = parseStored<unknown>(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }

    if (!stored || isExpired(stored.expiresAt)) return undefined;

    try {
      return decodeRecord(codecs[table], stored.value) as unknown as T;
    } catch (error) {
      throw new VaultError(`validation failed for table "${String(table)}"`, { cause: error });
    }
  };

  /** Removes a stale/expired/corrupt entry from storage and the owned-keys registry. */
  const evict = (storageKey: string): void => {
    storage().removeItem(storageKey);
    ownedKeys.delete(storageKey);
  };

  const core: StorageBackend<S> = {
    async clear<K extends keyof S & string>(table: K): Promise<void> {
      syncOwnedKeys();
      const target = storage();
      const prefix = getPrefix(table);
      const toRemove: string[] = [];

      for (const key of ownedKeys) {
        if (key.startsWith(prefix)) toRemove.push(key);
      }

      for (const key of toRemove) {
        target.removeItem(key);
        ownedKeys.delete(key);
      }
    },

    async delete<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      const storageKey = encodeStorageKey(name, table, key);
      const value = parseEntry<RecordOf<S, K>>(table, storageKey);

      if (value !== undefined) {
        evict(storageKey);

        return true;
      }

      if (ownedKeys.has(storageKey)) evict(storageKey);

      return false;
    },

    async get<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
      const storageKey = encodeStorageKey(name, table, key);
      const value = parseEntry<RecordOf<S, K>>(table, storageKey);

      if (value === undefined && ownedKeys.has(storageKey)) evict(storageKey);

      return value;
    },

    async getAll<K extends keyof S & string>(table: K): Promise<RecordOf<S, K>[]> {
      syncOwnedKeys();
      const records: RecordOf<S, K>[] = [];
      const expiredKeys: string[] = [];
      const prefix = getPrefix(table);

      for (const storageKey of ownedKeys) {
        if (!storageKey.startsWith(prefix)) continue;

        const value = parseEntry<RecordOf<S, K>>(table, storageKey);

        if (value === undefined) {
          expiredKeys.push(storageKey);
          continue;
        }

        records.push(value);
      }

      for (const storageKey of expiredKeys) {
        evict(storageKey);
      }

      return records;
    },

    async pruneExpiredInTable<K extends keyof S & string>(table: K): Promise<number> {
      syncOwnedKeys();
      const prefix = getPrefix(table);
      const expiredKeys: string[] = [];

      for (const storageKey of ownedKeys) {
        if (!storageKey.startsWith(prefix)) continue;

        const raw = storage().getItem(storageKey);

        if (raw === null) {
          expiredKeys.push(storageKey);
          continue;
        }

        try {
          const stored = parseStored(JSON.parse(raw) as unknown);

          if (!stored || isExpired(stored.expiresAt)) {
            expiredKeys.push(storageKey);
          }
        } catch {
          expiredKeys.push(storageKey);
        }
      }

      for (const storageKey of expiredKeys) {
        evict(storageKey);
      }

      return expiredKeys.length;
    },

    async put<K extends keyof S & string>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void> {
      const storageKey = encodeStorageKey(name, table, getRecordKey(schema, table, value));
      const expiresAt = ttl !== undefined ? Date.now() + ttl : undefined;
      const encoded = encodeRecord(codecs[table], value);

      writeItem(table, storageKey, expiresAt === undefined ? { value: encoded } : { expiresAt, value: encoded });
      ownedKeys.add(storageKey);
    },

    async putAll<K extends keyof S & string>(table: K, values: RecordOf<S, K>[], ttl?: number): Promise<void> {
      const expiresAt = ttl !== undefined ? Date.now() + ttl : undefined;

      for (const value of values) {
        const storageKey = encodeStorageKey(name, table, getRecordKey(schema, table, value));
        const encoded = encodeRecord(codecs[table], value);

        writeItem(table, storageKey, expiresAt === undefined ? { value: encoded } : { expiresAt, value: encoded });
        ownedKeys.add(storageKey);
      }
    },
  };

  return buildKeyValueStore(schema, core, {
    codecs,
    onCrossTabMessage(notify) {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
        return undefined;
      }

      const listener = (event: StorageEvent) => {
        if (event.storageArea && event.storageArea !== resolvedStorage) return;

        if (event.key === null) {
          // storage.clear() from another tab — all keys are gone; purge ownedKeys
          ownedKeys.clear();

          for (const table of Object.keys(schema)) {
            notify(table as keyof S & string);
          }

          return;
        }

        const tableName = decodeStorageTableFromKey(name, event.key);

        if (tableName && Object.hasOwn(schema, tableName)) {
          if (event.newValue === null) {
            ownedKeys.delete(event.key);
          } else {
            ownedKeys.add(event.key);
          }

          notify(tableName as keyof S & string);
        }
      };

      window.addEventListener('storage', listener);

      return () => window.removeEventListener('storage', listener);
    },
    schema,
  });
}

export function createLocalStorage<S extends AnySchema>(options: WebStorageOptions<S>): KeyValueVaultStore<S> {
  return createWebStorageAdapter({
    ...options,
    getStorage: () => (typeof window !== 'undefined' ? window.localStorage : localStorage),
    storageLabel: 'localStorage',
  });
}

export function createSessionStorage<S extends AnySchema>(options: WebStorageOptions<S>): KeyValueVaultStore<S> {
  return createWebStorageAdapter({
    ...options,
    getStorage: () => (typeof window !== 'undefined' ? window.sessionStorage : sessionStorage),
    storageLabel: 'sessionStorage',
  });
}
