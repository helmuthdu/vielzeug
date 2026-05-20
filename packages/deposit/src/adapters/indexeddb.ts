import type { DepositLogger, TableValidators } from '../plugins';
import type {
  Adapter,
  AnySchema,
  KeyOf,
  MetricsEvent,
  MigrationFn,
  RecordOf,
  TransactionContext,
  TtlMs,
} from '../types';

import { buildAdapterOps, buildTxContext, type CoreRuntimeOps, type CoreStorageOps } from '../adapter-core';
import { getRecordKey } from '../internal';
import { type StoredRecord, parseStored, unwrapStored, wrapStored } from '../ttl';

function idbReq<R>(request: IDBRequest<R>): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('[deposit] IndexedDB request failed'));
  });
}

function wrapTxError(scope: string, message: string, cause: unknown): Error {
  return new Error(`[deposit] ${message} on "${scope}"`, { cause });
}

function runIdbTx<T>(tx: IDBTransaction, scope: string, work: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let result: T | undefined;
    let callbackError: unknown;

    Promise.resolve()
      .then(work)
      .then((value) => {
        result = value;
      })
      .catch((error) => {
        callbackError = error;

        try {
          tx.abort();
        } catch {
          /* ignore */
        }
      });

    tx.oncomplete = () => {
      if (callbackError) {
        reject(wrapTxError(scope, 'transaction failed', callbackError));

        return;
      }

      resolve(result as T);
    };
    tx.onerror = () => reject(wrapTxError(scope, 'transaction error', tx.error));
    tx.onabort = () => reject(wrapTxError(scope, 'transaction aborted', callbackError ?? tx.error));
  });
}

async function getAllFromStore<T extends Record<string, unknown>>(store: IDBObjectStore): Promise<T[]> {
  const rawRecords = await idbReq<StoredRecord<T>[]>(store.getAll());
  const records: T[] = [];

  for (const raw of rawRecords) {
    const parsed = parseStored<T>(raw as unknown);

    if (!parsed) continue;

    const value = unwrapStored(parsed);

    if (value !== undefined) {
      records.push(value);
    }
  }

  return records;
}

type IndexedDbOptions<S extends AnySchema> = {
  logger?: DepositLogger;
  migrate?: MigrationFn;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  validators?: TableValidators<S>;
  version: number;
};

export function createIndexedDB<S extends AnySchema>(options: IndexedDbOptions<S>): Adapter<S> {
  const { logger, migrate, name, onMetrics, schema, validators, version } = options;
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`deposit:${name}`) : undefined;
  let db: IDBDatabase | null = null;
  let connectPromise: Promise<void> | null = null;
  let disposed = false;

  const createObjectStores = (target: IDBDatabase): void => {
    for (const tableName of Object.keys(schema)) {
      if (!target.objectStoreNames.contains(tableName)) {
        target.createObjectStore(tableName);
      }
    }
  };

  const connect = async (): Promise<void> => {
    if (!connectPromise) {
      connectPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(name, version);

        request.onupgradeneeded = (event) => {
          const target = request.result;
          const tx = request.transaction!;

          if (migrate) {
            try {
              migrate({
                db: target,
                newVersion: (event as IDBVersionChangeEvent).newVersion ?? null,
                oldVersion: event.oldVersion,
                tx,
              });
            } catch (error) {
              try {
                tx.abort();
              } catch {
                /* ignore */
              }

              reject(new Error(`[deposit] migration failed for "${name}"`, { cause: error }));

              return;
            }
          }

          createObjectStores(target);
        };

        request.onsuccess = () => {
          if (disposed) {
            request.result.close();
            resolve();

            return;
          }

          db = request.result;
          resolve();
        };
        request.onerror = () => {
          connectPromise = null;
          reject(new Error(`[deposit] failed to open "${name}"`, { cause: request.error }));
        };
      });
    }

    return connectPromise;
  };

  const withStore = async <T>(
    table: keyof S,
    mode: 'readonly' | 'readwrite',
    fn: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> => {
    if (disposed) throw new Error(`[deposit] "${name}" is disposed`);

    if (!db) await connect();

    if (!db) throw new Error(`[deposit] "${name}" is disposed`);

    const tableName = String(table);
    const tx = db.transaction(tableName, mode);

    return runIdbTx(tx, `${name}/${tableName}`, () => fn(tx.objectStore(tableName)));
  };

  const requireDb = async (): Promise<IDBDatabase> => {
    if (disposed) throw new Error(`[deposit] "${name}" is disposed`);

    if (!db) await connect();

    if (!db) throw new Error(`[deposit] "${name}" is disposed`);

    return db;
  };

  const publish = <K extends keyof S>(table: K): void => {
    channel?.postMessage({ table: String(table) });
  };

  const core: CoreRuntimeOps<S> = {
    async clear<K extends keyof S>(table: K): Promise<number> {
      return withStore(table, 'readwrite', async (store) => {
        const count = await idbReq(store.count());

        if (count > 0) await idbReq(store.clear());

        return count;
      });
    },

    async count<K extends keyof S>(table: K): Promise<number> {
      const records = await withStore(table, 'readonly', (store) => getAllFromStore<RecordOf<S, K>>(store));

      return records.length;
    },

    async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      return withStore(table, 'readwrite', async (store) => {
        const raw = await idbReq<unknown>(store.get(key as IDBValidKey));

        if (raw == null) return false;

        await idbReq(store.delete(key as IDBValidKey));

        return true;
      });
    },

    async deleteMany<K extends keyof S>(table: K, keys: KeyOf<S, K>[]): Promise<number> {
      if (keys.length === 0) return 0;

      return withStore(table, 'readwrite', async (store) => {
        let deleted = 0;

        for (const key of keys) {
          const raw = await idbReq<unknown>(store.get(key as IDBValidKey));

          if (raw != null) {
            await idbReq(store.delete(key as IDBValidKey));
            deleted += 1;
          }
        }

        return deleted;
      });
    },

    dispose() {
      disposed = true;
      db?.close();
      db = null;
      connectPromise = null;
      channel?.close();
    },

    async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
      const raw = await withStore(table, 'readonly', (store) => idbReq<unknown>(store.get(key as IDBValidKey)));

      if (raw == null) return undefined;

      const parsed = parseStored<RecordOf<S, K>>(raw);

      if (!parsed) return undefined;

      return unwrapStored(parsed);
    },

    async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
      return withStore(table, 'readonly', (store) => getAllFromStore<RecordOf<S, K>>(store));
    },

    async getRawCount<K extends keyof S>(table: K): Promise<number> {
      return withStore(table, 'readonly', (store) => idbReq(store.count()));
    },

    async has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      return withStore(table, 'readonly', async (store) => {
        const raw = await idbReq<unknown>(store.get(key as IDBValidKey));

        if (raw == null) return false;

        const parsed = parseStored<RecordOf<S, K>>(raw);

        return parsed ? unwrapStored(parsed) !== undefined : false;
      });
    },

    async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void> {
      const key = getRecordKey(schema, table, value) as IDBValidKey;

      await withStore(table, 'readwrite', (store) =>
        idbReq(store.put(wrapStored(value, ttl), key)).then(() => undefined),
      );
    },

    async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
      await withStore(table, 'readwrite', async (store) => {
        await Promise.all(
          values.map((value) => {
            const key = getRecordKey(schema, table, value) as IDBValidKey;

            return idbReq(store.put(wrapStored(value, ttl), key));
          }),
        );
      });
    },
  };

  /* IDB-specific batch: runs inside a real IDB transaction (atomic) */
  const idbBatch = async <K extends keyof S, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
    notifyMutation: (table: keyof S) => void,
    validateFn: <T extends keyof S>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  ): Promise<R> => {
    const idb = await requireDb();
    const idbTx = idb.transaction(tables.map(String), 'readwrite');
    const storeOf = <T extends K>(table: T) => idbTx.objectStore(String(table));
    const dirtyTables = new Set<K>();

    const txCore: CoreStorageOps<S, K> = {
      async clear<T extends K>(table: T): Promise<number> {
        const count = await idbReq(storeOf(table).count());

        if (count > 0) await idbReq(storeOf(table).clear());

        return count;
      },

      async count<T extends K>(table: T): Promise<number> {
        const records = await getAllFromStore<RecordOf<S, T>>(storeOf(table));

        return records.length;
      },

      async delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean> {
        const raw = await idbReq<unknown>(storeOf(table).get(key as IDBValidKey));

        if (raw == null) return false;

        await idbReq(storeOf(table).delete(key as IDBValidKey));

        return true;
      },

      async deleteMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<number> {
        let deleted = 0;

        for (const key of keys) {
          const raw = await idbReq<unknown>(storeOf(table).get(key as IDBValidKey));

          if (raw != null) {
            await idbReq(storeOf(table).delete(key as IDBValidKey));
            deleted += 1;
          }
        }

        return deleted;
      },

      async get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined> {
        const raw = await idbReq<unknown>(storeOf(table).get(key as IDBValidKey));

        if (raw == null) return undefined;

        const parsed = parseStored<RecordOf<S, T>>(raw);

        if (!parsed) return undefined;

        return unwrapStored(parsed);
      },

      async getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]> {
        return getAllFromStore<RecordOf<S, T>>(storeOf(table));
      },

      async has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean> {
        const raw = await idbReq<unknown>(storeOf(table).get(key as IDBValidKey));

        if (raw == null) return false;

        const parsed = parseStored<RecordOf<S, T>>(raw);

        return parsed ? unwrapStored(parsed) !== undefined : false;
      },

      async put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<void> {
        const key = getRecordKey(schema, table, value) as IDBValidKey;

        await idbReq(storeOf(table).put(wrapStored(value, ttl), key));
      },

      async putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: TtlMs): Promise<void> {
        await Promise.all(
          values.map((value) => {
            const key = getRecordKey(schema, table, value) as IDBValidKey;

            return idbReq(storeOf(table).put(wrapStored(value, ttl), key));
          }),
        );
      },
    };

    const txOps = buildTxContext<S, K>(
      schema,
      txCore,
      (t) => dirtyTables.add(t),
      validateFn as <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
    );
    const result = await runIdbTx(idbTx, name, () => fn(txOps));

    for (const table of dirtyTables) {
      notifyMutation(table);
    }

    return result;
  };

  const { adapter } = buildAdapterOps(schema, core, {
    batch: idbBatch,
    connectExternal(notify) {
      if (!channel) {
        return undefined;
      }

      channel.onmessage = (event: MessageEvent<{ table?: string }>) => {
        const tableName = event.data?.table;

        if (!tableName) return;

        notify(tableName as keyof S);
      };

      return () => {
        channel.onmessage = null;
      };
    },
    logger,
    onMetrics,
    onMutation: publish,
    validators,
  });

  return adapter;
}
