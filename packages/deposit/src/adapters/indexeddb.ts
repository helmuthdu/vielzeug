import type { DepositLogger, TableSignals, TableValidators } from '../plugins';
import type { Adapter, AnySchema, MetricsEvent, MigrationFn, RecordOf, TransactionContext, TtlMs } from '../types';

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
  const causeMessage = cause instanceof Error && cause.message ? `: ${cause.message}` : '';

  return new Error(`[deposit] ${message} on "${scope}"${causeMessage}`, { cause });
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

function countLiveRecordsInStore<T extends Record<string, unknown>>(store: IDBObjectStore): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let count = 0;
    const request = store.openCursor();

    request.onerror = () => reject(request.error ?? new Error('[deposit] IndexedDB cursor failed'));
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve(count);

        return;
      }

      const parsed = parseStored<T>(cursor.value as unknown);

      if (parsed && unwrapStored(parsed) !== undefined) {
        count += 1;
      }

      cursor.continue();
    };
  });
}

async function storeHasKey(store: IDBObjectStore, key: IDBValidKey): Promise<boolean> {
  return (await idbReq(store.getKey(key))) !== undefined;
}

/* -------------------- Per-store primitive helpers -------------------- */
/* Shared between single-table withStore() callbacks and multi-table idbBatch txCore.
   Keeping them here enables one code path for bug fixes rather than two separate copies. */

async function storeGet<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  key: IDBValidKey,
): Promise<T | undefined> {
  const raw = await idbReq<unknown>(store.get(key));

  if (raw == null) return undefined;

  const parsed = parseStored<T>(raw);

  if (!parsed) return undefined;

  return unwrapStored(parsed);
}

/** TTL-aware existence check — returns false for expired records (consistent with get). */
async function storeHas<T extends Record<string, unknown>>(store: IDBObjectStore, key: IDBValidKey): Promise<boolean> {
  const raw = await idbReq<unknown>(store.get(key));

  if (raw == null) return false;

  const parsed = parseStored<T>(raw);

  return parsed ? unwrapStored(parsed) !== undefined : false;
}

async function storeClear(store: IDBObjectStore): Promise<number> {
  const count = await idbReq(store.count());

  if (count > 0) await idbReq(store.clear());

  return count;
}

async function storeDelete(store: IDBObjectStore, key: IDBValidKey): Promise<boolean> {
  const exists = await storeHasKey(store, key);

  if (!exists) return false;

  await idbReq(store.delete(key));

  return true;
}

async function storeDeleteMany(store: IDBObjectStore, keys: IDBValidKey[]): Promise<number> {
  let deleted = 0;

  for (const key of keys) {
    if (await storeHasKey(store, key)) {
      await idbReq(store.delete(key));
      deleted += 1;
    }
  }

  return deleted;
}

async function storePutAt<T>(store: IDBObjectStore, key: IDBValidKey, value: T, ttl?: TtlMs): Promise<void> {
  await idbReq(store.put(wrapStored(value, ttl), key));
}

/**
 * Cursor-based pruning: deletes every TTL-expired record in a single readwrite transaction.
 * Unlike getAll(), this does not materialise records into memory.
 */
function pruneExpiredInStore(store: IDBObjectStore): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let deleted = 0;
    const request = store.openCursor();

    request.onerror = () => reject(request.error ?? new Error('[deposit] IndexedDB cursor failed during prune'));
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve(deleted);

        return;
      }

      const parsed = parseStored(cursor.value as unknown);

      if (!parsed || unwrapStored(parsed) === undefined) {
        cursor.delete();
        deleted += 1;
      }

      cursor.continue();
    };
  });
}

type IndexedDbOptions<S extends AnySchema> = {
  logger?: DepositLogger;
  migrate?: MigrationFn;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  signals?: TableSignals<S>;
  validators?: TableValidators<S>;
  version: number;
};

export function createIndexedDB<S extends AnySchema>(options: IndexedDbOptions<S>): Adapter<S> {
  const { logger, migrate, name, onMetrics, schema, signals, validators, version } = options;
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
    clear: (table) => withStore(table, 'readwrite', storeClear),

    count: (table) => withStore(table, 'readonly', (s) => countLiveRecordsInStore<RecordOf<S, typeof table>>(s)),

    delete: (table, key) => withStore(table, 'readwrite', (s) => storeDelete(s, key as IDBValidKey)),

    deleteMany: (table, keys) =>
      keys.length === 0
        ? Promise.resolve(0)
        : withStore(table, 'readwrite', (s) => storeDeleteMany(s, keys as IDBValidKey[])),

    dispose() {
      disposed = true;
      db?.close();
      db = null;
      connectPromise = null;
      channel?.close();
    },

    get: (table, key) =>
      withStore(table, 'readonly', (s) => storeGet<RecordOf<S, typeof table>>(s, key as IDBValidKey)),

    getAll: (table) => withStore(table, 'readonly', (s) => getAllFromStore<RecordOf<S, typeof table>>(s)),

    getRawCount: (table) => withStore(table, 'readonly', (s) => idbReq(s.count())),

    has: (table, key) =>
      withStore(table, 'readonly', (s) => storeHas<RecordOf<S, typeof table>>(s, key as IDBValidKey)),

    pruneExpiredInTable: (table) => withStore(table, 'readwrite', pruneExpiredInStore),

    put(table, value, ttl) {
      const key = getRecordKey(schema, table, value) as IDBValidKey;

      return withStore(table, 'readwrite', (s) => storePutAt(s, key, value, ttl));
    },

    putAll(table, values, ttl) {
      return withStore(table, 'readwrite', (s) =>
        Promise.all(values.map((v) => storePutAt(s, getRecordKey(schema, table, v) as IDBValidKey, v, ttl))).then(
          () => undefined,
        ),
      );
    },
  };

  /* IDB-specific batch: runs inside a real IDB transaction (atomic) */
  const idbBatch = async <K extends keyof S, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
    notifyMutation: (table: K) => void,
    validateFn: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  ): Promise<R> => {
    const idb = await requireDb();
    const idbTx = idb.transaction(tables.map(String), 'readwrite');
    const storeOf = <T extends K>(table: T) => idbTx.objectStore(String(table));
    const dirtyTables = new Set<K>();

    const txCore: CoreStorageOps<S, K> = {
      clear: (table) => storeClear(storeOf(table)),
      count: (table) => countLiveRecordsInStore<RecordOf<S, typeof table>>(storeOf(table)),
      delete: (table, key) => storeDelete(storeOf(table), key as IDBValidKey),
      deleteMany: (table, keys) => storeDeleteMany(storeOf(table), keys as IDBValidKey[]),
      get: (table, key) => storeGet<RecordOf<S, typeof table>>(storeOf(table), key as IDBValidKey),
      getAll: (table) => getAllFromStore<RecordOf<S, typeof table>>(storeOf(table)),
      has: (table, key) => storeHas<RecordOf<S, typeof table>>(storeOf(table), key as IDBValidKey),
      put(table, value, ttl) {
        return storePutAt(storeOf(table), getRecordKey(schema, table, value) as IDBValidKey, value, ttl);
      },
      putAll(table, values, ttl) {
        return Promise.all(
          values.map((v) => storePutAt(storeOf(table), getRecordKey(schema, table, v) as IDBValidKey, v, ttl)),
        ).then(() => undefined);
      },
    };

    const txOps = buildTxContext<S, K>(schema, txCore, (t) => dirtyTables.add(t), validateFn);
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
    signals,
    validators,
  });

  return adapter;
}
