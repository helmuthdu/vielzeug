import type { Adapter, AnySchema, BaseAdapterOptions, KeyOf, RecordOf, TtlMs } from '../types';

import { buildAdapterOps, type StorageBackend } from '../adapter-core';
import { VaultError, VaultQuotaError } from '../errors';
import {
  decodeStorageTableFromKey,
  encodeDbPrefix,
  encodeStorageKey,
  encodeStorageTablePrefix,
  getRecordKey,
} from '../internal';
import { defaultCodec, isExpired } from '../ttl';

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
  const {
    codec = defaultCodec,
    getStorage,
    logger,
    name,
    onMetrics,
    onQuotaExceeded,
    schema,
    signals,
    storageLabel,
    validators,
  } = options;

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

  // Per-instance registry of all storage keys owned by this adapter instance.
  // Populated once at construction; kept current by every mutation.
  const ownedKeys = new Set<string>();

  const initOwnedKeys = (): void => {
    const dbPrefix = encodeDbPrefix(name);

    for (let i = 0; i < resolvedStorage.length; i++) {
      const key = resolvedStorage.key(i);

      if (key !== null && key.startsWith(dbPrefix)) ownedKeys.add(key);
    }
  };

  initOwnedKeys();

  /**
   * Reads a single entry without side effects. Returns the live value,
   * or `undefined` if missing/expired/corrupt.
   *
   * Callers that want to evict stale entries must call `evict(storageKey)` explicitly.
   * This design avoids the `{ cleanup?: boolean }` flag that required callers to remember
   * to pass `{ cleanup: false }` inside loops.
   */
  const parseEntry = <T extends Record<string, unknown>>(storageKey: string): T | undefined => {
    const raw = storage().getItem(storageKey);

    if (!raw) return undefined;

    try {
      const stored = codec.decode<T>(JSON.parse(raw) as unknown);

      if (!stored || isExpired(stored.expiresAt)) return undefined;

      return stored.value;
    } catch {
      return undefined;
    }
  };

  /** Removes a stale/expired/corrupt entry from storage and the owned-keys registry. */
  const evict = (storageKey: string): void => {
    storage().removeItem(storageKey);
    ownedKeys.delete(storageKey);
  };

  const core: StorageBackend<S> = {
    async clear<K extends keyof S & string>(table: K): Promise<void> {
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

    async count<K extends keyof S & string>(table: K): Promise<number> {
      const prefix = getPrefix(table);
      const expiredKeys: string[] = [];
      let liveCount = 0;

      for (const storageKey of ownedKeys) {
        if (!storageKey.startsWith(prefix)) continue;

        const value = parseEntry<RecordOf<S, K>>(storageKey);

        if (value === undefined) {
          expiredKeys.push(storageKey);
        } else {
          liveCount += 1;
        }
      }

      for (const storageKey of expiredKeys) {
        evict(storageKey);
      }

      return liveCount;
    },

    async delete<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      const storageKey = encodeStorageKey(name, table, String(key));
      const value = parseEntry<RecordOf<S, K>>(storageKey);

      if (value !== undefined) {
        evict(storageKey);

        return true;
      }

      if (ownedKeys.has(storageKey)) evict(storageKey);

      return false;
    },

    async deleteMany<K extends keyof S & string>(table: K, keys: KeyOf<S, K>[]): Promise<number> {
      let deleted = 0;

      for (const key of keys) {
        const storageKey = encodeStorageKey(name, table, String(key));
        const value = parseEntry<RecordOf<S, K>>(storageKey);

        if (value !== undefined) {
          evict(storageKey);
          deleted += 1;
        } else if (ownedKeys.has(storageKey)) {
          evict(storageKey);
        }
      }

      return deleted;
    },

    async get<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
      const storageKey = encodeStorageKey(name, table, String(key));
      const value = parseEntry<RecordOf<S, K>>(storageKey);

      if (value === undefined && ownedKeys.has(storageKey)) evict(storageKey);

      return value;
    },

    async getAll<K extends keyof S & string>(table: K): Promise<RecordOf<S, K>[]> {
      const records: RecordOf<S, K>[] = [];
      const expiredKeys: string[] = [];
      const prefix = getPrefix(table);

      for (const storageKey of ownedKeys) {
        if (!storageKey.startsWith(prefix)) continue;

        const value = parseEntry<RecordOf<S, K>>(storageKey);

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

    async getAllKeys<K extends keyof S & string>(table: K): Promise<KeyOf<S, K>[]> {
      const prefix = getPrefix(table);
      const keys: KeyOf<S, K>[] = [];
      const expiredStorageKeys: string[] = [];

      for (const storageKey of ownedKeys) {
        if (!storageKey.startsWith(prefix)) continue;

        const value = parseEntry<RecordOf<S, K>>(storageKey);

        if (value === undefined) {
          expiredStorageKeys.push(storageKey);
          continue;
        }

        // Extract the record key from the already-decoded value (avoids a second parse).
        keys.push((value as Record<string, unknown>)[schema[table].key] as KeyOf<S, K>);
      }

      for (const storageKey of expiredStorageKeys) {
        evict(storageKey);
      }

      return keys;
    },

    async getRawCount<K extends keyof S & string>(table: K): Promise<number> {
      const prefix = getPrefix(table);
      let count = 0;

      for (const key of ownedKeys) {
        if (key.startsWith(prefix)) count += 1;
      }

      return count;
    },

    async has<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      const storageKey = encodeStorageKey(name, table, String(key));
      const value = parseEntry<RecordOf<S, K>>(storageKey);

      if (value === undefined && ownedKeys.has(storageKey)) evict(storageKey);

      return value !== undefined;
    },

    async pruneExpiredInTable<K extends keyof S & string>(table: K): Promise<number> {
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
          const stored = codec.decode(JSON.parse(raw) as unknown);

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

    async put<K extends keyof S & string>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void> {
      const storageKey = encodeStorageKey(name, table, String(getRecordKey(schema, table, value)));
      const expiresAt = ttl !== undefined ? Date.now() + ttl : undefined;

      writeItem(table, storageKey, codec.encode(value, expiresAt));
      ownedKeys.add(storageKey);
    },

    async putAll<K extends keyof S & string>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
      const expiresAt = ttl !== undefined ? Date.now() + ttl : undefined;

      for (const value of values) {
        const storageKey = encodeStorageKey(name, table, String(getRecordKey(schema, table, value)));

        writeItem(table, storageKey, codec.encode(value, expiresAt));
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
