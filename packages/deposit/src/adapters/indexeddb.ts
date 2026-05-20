import type {
  Adapter,
  AnySchema,
  DepositLogger,
  MetricsEvent,
  MigrationFn,
  RecordOf,
  TableSignals,
  TableValidators,
  TransactionContext,
  TtlMs,
} from '../types';

import { buildAdapterOps, buildTxContext, type StorageBackend, type StorageCore } from '../adapter-core';
import { DepositDisposedError, DepositError, DepositMigrationError } from '../errors';
import { getRecordKey } from '../internal';
import { type NativeRange } from '../query';
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
        // Preserve DepositError subtype identity — re-throwing keeps instanceof checks intact.
        if (callbackError instanceof DepositError) {
          reject(callbackError);

          return;
        }

        reject(wrapTxError(scope, 'transaction failed', callbackError));

        return;
      }

      resolve(result as T);
    };
    tx.onerror = () => reject(wrapTxError(scope, 'transaction error', tx.error));
    tx.onabort = () => {
      // Preserve DepositError subtype identity — re-throwing keeps instanceof checks intact.
      if (callbackError instanceof DepositError) {
        reject(callbackError);

        return;
      }

      reject(wrapTxError(scope, 'transaction aborted', callbackError ?? tx.error));
    };
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

/**
 * Fetches records matching a primary-key range without a full table scan.
 * For `eq`, uses a single `store.get` instead of `store.getAll`. For `between` and `starts`,
 * uses an IDBKeyRange to let the storage engine do the filtering.
 */
async function getAllFromStoreWithRange<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  range: NativeRange,
): Promise<T[]> {
  if (range.type === 'eq') {
    const record = await storeGet<T>(store, range.value as IDBValidKey);

    return record !== undefined ? [record] : [];
  }

  const idbRange =
    range.type === 'between'
      ? IDBKeyRange.bound(range.lower as IDBValidKey, range.upper as IDBValidKey)
      : // 'starts': bound from prefix to prefix\uffff (covers all BMP strings starting with prefix)
        IDBKeyRange.bound(range.prefix, range.prefix + '\uffff');

  const rawRecords = await idbReq<StoredRecord<T>[]>(store.getAll(idbRange));
  const records: T[] = [];

  for (const raw of rawRecords) {
    const parsed = parseStored<T>(raw as unknown);

    if (!parsed) continue;

    const value = unwrapStored(parsed);

    if (value !== undefined) records.push(value);
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

/** Clear all records from a store unconditionally. */
async function storeClear(store: IDBObjectStore): Promise<void> {
  await idbReq(store.clear());
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

async function storeDelete(store: IDBObjectStore, key: IDBValidKey): Promise<boolean> {
  const live = await storeHas(store, key); // TTL-aware: returns false for expired records

  await idbReq(store.delete(key)); // always clean up the physical entry (no-op if missing)

  return live;
}

async function storeDeleteMany(store: IDBObjectStore, keys: IDBValidKey[]): Promise<number> {
  if (keys.length === 0) return 0;

  // Use storeDelete (TTL-aware) for each key so that expired records do not inflate the count.
  // storeDelete also cleans up the physical IDB entry for expired records.
  const results = await Promise.all(keys.map((k) => storeDelete(store, k)));

  return results.filter(Boolean).length;
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
  /** Schema version. Must be a positive integer. Increment when adding tables or changing the schema, then provide `migrate`. Defaults to 1. */
  version?: number;
};

export function createIndexedDB<S extends AnySchema>(options: IndexedDbOptions<S>): Adapter<S> {
  const { logger, migrate, name, onMetrics, schema, signals, validators, version = 1 } = options;

  if (!Number.isInteger(version) || version < 1) {
    throw new RangeError(`[deposit] createIndexedDB version must be a positive integer, got ${String(version)}`);
  }

  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`deposit:${name}`) : undefined;

  if (!channel && logger) {
    logger.error(`[deposit] BroadcastChannel unavailable — cross-tab sync disabled for "${name}"`);
  }

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

              reject(new DepositMigrationError(`migration failed for "${name}"`, { cause: error }));

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

          const connection = request.result;

          // Handle versionchange so an upgrading tab in another window is not blocked.
          // When another tab opens this DB at a higher version, IDB fires `versionchange` here.
          // Closing the connection allows the upgrade to proceed; the next operation will reconnect.
          connection.onversionchange = () => {
            connection.close();
            db = null;
            connectPromise = null;
          };

          db = connection;
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
    if (disposed) throw new DepositDisposedError(`"${name}" is disposed`);

    if (!db) await connect();

    if (!db) throw new DepositDisposedError(`"${name}" is disposed`);

    const tableName = String(table);
    const tx = db.transaction(tableName, mode);

    return runIdbTx(tx, `${name}/${tableName}`, () => fn(tx.objectStore(tableName)));
  };

  const requireDb = async (): Promise<IDBDatabase> => {
    if (disposed) throw new DepositDisposedError(`"${name}" is disposed`);

    if (!db) await connect();

    if (!db) throw new DepositDisposedError(`"${name}" is disposed`);

    return db;
  };

  const publish = <K extends keyof S>(table: K): void => {
    channel?.postMessage({ table: String(table) });
  };

  const core: StorageBackend<S> = {
    // clear returns void — the count/notify decision happens in buildTxContext.clear via core.count()
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

    getByKeyRange: (table, range) =>
      withStore(table, 'readonly', (s) => getAllFromStoreWithRange<RecordOf<S, typeof table>>(s, range)),

    // getMany opens ONE readonly transaction and fires all key lookups in parallel within it,
    // avoiding the N-transaction overhead of the N-individual-get fallback.
    getMany: (table, keys) =>
      keys.length === 0
        ? Promise.resolve([])
        : withStore(table, 'readonly', (s) =>
            Promise.all(keys.map((k) => storeGet<RecordOf<S, typeof table>>(s, k as IDBValidKey))),
          ),

    getRawCount: (table) => withStore(table, 'readonly', (s) => idbReq(s.count())),

    has: (table, key) =>
      withStore(table, 'readonly', (s) => storeHas<RecordOf<S, typeof table>>(s, key as IDBValidKey)),

    async pruneAllExpired() {
      const idb = await requireDb();
      const tableNames = Object.keys(schema);
      const tx = idb.transaction(tableNames, 'readwrite');
      const results = await runIdbTx(tx, `${name}/pruneAll`, () =>
        Promise.all(tableNames.map(async (t) => [t, await pruneExpiredInStore(tx.objectStore(t))] as const)),
      );

      return Object.fromEntries(results);
    },

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

    const txCore: StorageCore<S, K> = {
      // clear returns void — count/notify decision is handled by buildTxContext.clear
      clear: async (table) => {
        await idbReq(storeOf(table).clear());
      },
      count: (table) => countLiveRecordsInStore<RecordOf<S, typeof table>>(storeOf(table)),
      delete: (table, key) => storeDelete(storeOf(table), key as IDBValidKey),
      deleteMany: (table, keys) => storeDeleteMany(storeOf(table), keys as IDBValidKey[]),
      get: (table, key) => storeGet<RecordOf<S, typeof table>>(storeOf(table), key as IDBValidKey),
      getAll: (table) => getAllFromStore<RecordOf<S, typeof table>>(storeOf(table)),
      // Within a batch all storeGet calls share the same IDB transaction — no extra cost.
      getByKeyRange: (table, range) => getAllFromStoreWithRange<RecordOf<S, typeof table>>(storeOf(table), range),
      getMany: (table, keys) =>
        Promise.all(keys.map((k) => storeGet<RecordOf<S, typeof table>>(storeOf(table), k as IDBValidKey))),
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

    const scope = new Set(tables.map(String));
    const tx = buildTxContext<S, K>(schema, txCore, (t) => dirtyTables.add(t), validateFn, scope);
    const result = await runIdbTx(idbTx, name, () => fn(tx));

    for (const table of dirtyTables) {
      notifyMutation(table);
    }

    return result;
  };

  return buildAdapterOps(schema, core, {
    buildBatch:
      ({ notifyMutation, validate: validateFn }) =>
      (tables, fn) =>
        idbBatch(tables, fn, notifyMutation, validateFn),
    logger,
    onCrossTabMessage(notify) {
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
    onMetrics,
    onMutation: publish,
    signals,
    validators,
  });
}
