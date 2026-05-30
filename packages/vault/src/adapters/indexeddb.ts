import type {
  Adapter,
  AnySchema,
  BaseAdapterOptions,
  MigrationFn,
  RecordOf,
  TransactionContext,
  TtlMs,
} from '../types';

import { buildAdapterOps, buildTxContext, type StorageBackend } from '../adapter-core';
import { VaultDisposedError, VaultMigrationError } from '../errors';
import { getRecordKey } from '../internal';
import { type NativeRange } from '../query';
import { type StoredRecord, parseStored, readWithTtl, unwrapStored, wrapStored } from '../ttl';

function idbReq<R>(request: IDBRequest<R>): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('[vault] IndexedDB request failed'));
  });
}

function wrapTxError(scope: string, message: string, cause: unknown): Error {
  const causeMessage = cause instanceof Error && cause.message ? `: ${cause.message}` : '';

  return new Error(`[vault] ${message} on "${scope}"${causeMessage}`, { cause });
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

    const rejectWithCallbackError = (fallbackCause: unknown, message = 'transaction failed'): void => {
      if (callbackError instanceof Error) {
        reject(callbackError);
      } else {
        reject(wrapTxError(scope, message, callbackError ?? fallbackCause));
      }
    };

    tx.oncomplete = () => {
      if (callbackError) {
        rejectWithCallbackError(undefined);

        return;
      }

      resolve(result as T);
    };
    tx.onerror = () => reject(wrapTxError(scope, 'transaction error', tx.error));
    tx.onabort = () => rejectWithCallbackError(tx.error, 'transaction aborted');
  });
}

async function getAllFromStore<T extends Record<string, unknown>>(store: IDBObjectStore): Promise<T[]> {
  const rawRecords = await idbReq<StoredRecord<T>[]>(store.getAll());
  const records: T[] = [];

  for (const raw of rawRecords) {
    const { value } = readWithTtl<T>(raw as unknown);

    if (value !== undefined) records.push(value);
  }

  return records;
}

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
    const { value } = readWithTtl<T>(raw as unknown);

    if (value !== undefined) records.push(value);
  }

  return records;
}

function countLiveRecordsInStore<T extends Record<string, unknown>>(store: IDBObjectStore): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let count = 0;
    const request = store.openCursor();

    request.onerror = () => reject(request.error ?? new Error('[vault] IndexedDB cursor failed'));
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve(count);

        return;
      }

      const { value } = readWithTtl<T>(cursor.value as unknown);

      if (value !== undefined) count += 1;

      cursor.continue();
    };
  });
}

async function storeClear(store: IDBObjectStore): Promise<void> {
  await idbReq(store.clear());
}

async function storeGet<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  key: IDBValidKey,
): Promise<T | undefined> {
  const raw = await idbReq<unknown>(store.get(key));

  if (raw == null) return undefined;

  const { value } = readWithTtl<T>(raw);

  return value;
}

async function storeHas<T extends Record<string, unknown>>(store: IDBObjectStore, key: IDBValidKey): Promise<boolean> {
  const raw = await idbReq<unknown>(store.get(key));

  if (raw == null) return false;

  const { value } = readWithTtl<T>(raw);

  return value !== undefined;
}

async function storeDelete(store: IDBObjectStore, key: IDBValidKey): Promise<boolean> {
  const live = await storeHas(store, key);

  await idbReq(store.delete(key));

  return live;
}

async function storeDeleteMany(store: IDBObjectStore, keys: IDBValidKey[]): Promise<number> {
  if (keys.length === 0) return 0;

  const results = await Promise.all(keys.map((k) => storeDelete(store, k)));

  return results.filter(Boolean).length;
}

async function storePutAt<T>(store: IDBObjectStore, key: IDBValidKey, value: T, ttl?: TtlMs): Promise<void> {
  await idbReq(store.put(wrapStored(value, ttl), key));
}

function pruneExpiredInStore(store: IDBObjectStore): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let deleted = 0;
    const request = store.openCursor();

    request.onerror = () => reject(request.error ?? new Error('[vault] IndexedDB cursor failed during prune'));
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

/**
 * F1: True cursor-based iteration for IndexedDB.
 * Yields live records one-by-one using an IDB cursor, avoiding materializing the full table.
 * This is memory-efficient for large tables — the cursor walks the store incrementally.
 *
 * Design: the cursor is opened *synchronously* in [Symbol.asyncIterator]() so that event
 * handlers are wired immediately (no queueMicrotask races). The cursor is advanced *eagerly*
 * before yielding — this keeps the IDB readonly transaction alive between consumer awaits,
 * because IDB auto-commits when there are no pending requests.
 */
function iterateStoreWithCursor<T extends Record<string, unknown>>(store: IDBObjectStore): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      // Open the cursor synchronously so onsuccess/onerror are wired before any microtask.
      const cursorRequest = store.openCursor();

      // One-slot buffer: the cursor advances eagerly (keeping the tx alive), and the
      // resolved value sits here until the consumer calls next().
      //
      // Error buffering uses a dedicated slot — the previous approach of repurposing
      // pendingReject as a throwing closure silently swallowed errors because the
      // stored function was only ever called as pendingReject?.(err), not throw-invoked.
      let buffered: IteratorResult<T> | null = null;
      let bufferedError: unknown = undefined;
      let hasBufferedError = false;
      let pendingResolve: ((r: IteratorResult<T>) => void) | null = null;
      let pendingReject: ((e: unknown) => void) | null = null;

      const deliver = (result: IteratorResult<T>): void => {
        if (pendingResolve) {
          const res = pendingResolve;

          pendingResolve = null;
          pendingReject = null;
          res(result);
        } else {
          buffered = result;
        }
      };

      cursorRequest.onerror = () => {
        const err = cursorRequest.error ?? new Error('[vault] IndexedDB cursor iteration failed');

        if (pendingReject) {
          const rej = pendingReject;

          pendingResolve = null;
          pendingReject = null;
          rej(err);
        } else {
          // Consumer hasn't called next() yet — buffer the error for the next next() call.
          hasBufferedError = true;
          bufferedError = err;
        }
      };

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;

        if (!cursor) {
          deliver({ done: true, value: undefined });

          return;
        }

        const { value } = readWithTtl<T>(cursor.value as unknown);

        if (value !== undefined) {
          // Advance the cursor eagerly BEFORE yielding so the IDB transaction
          // stays open while the consumer processes the current value.
          cursor.continue();
          deliver({ done: false, value });
        } else {
          // Skip expired record — advance immediately without yielding.
          cursor.continue();
        }
      };

      return {
        next(): Promise<IteratorResult<T>> {
          if (hasBufferedError) {
            const err = bufferedError;

            hasBufferedError = false;
            bufferedError = undefined;

            return Promise.reject(err);
          }

          if (buffered !== null) {
            const result = buffered;

            buffered = null;

            return Promise.resolve(result);
          }

          return new Promise<IteratorResult<T>>((res, rej) => {
            pendingResolve = res;
            pendingReject = rej;
          });
        },

        return(value?: unknown): Promise<IteratorResult<T>> {
          // Clean up pending waiters on early exit.
          pendingResolve?.({ done: true, value: undefined });
          pendingResolve = null;
          pendingReject = null;
          buffered = null;
          hasBufferedError = false;
          bufferedError = undefined;

          return Promise.resolve({ done: true, value });
        },

        throw(err?: unknown): Promise<IteratorResult<T>> {
          pendingReject?.(err);
          pendingResolve = null;
          pendingReject = null;
          buffered = null;
          hasBufferedError = false;
          bufferedError = undefined;

          return Promise.reject(err);
        },
      };
    },
  };
}

type IndexedDbOptions<S extends AnySchema> = BaseAdapterOptions<S> & {
  migrate?: MigrationFn;
  name: string;
  /** Schema version. Must be a positive integer. Increment when adding tables or changing the schema, then provide `migrate`. Defaults to 1. */
  version?: number;
};

export type IndexedDbAdapter<S extends AnySchema> = Adapter<S> & {
  iterate<K extends keyof S>(table: K): AsyncIterable<RecordOf<S, K>>;
};

export function createIndexedDB<S extends AnySchema>(options: IndexedDbOptions<S>): IndexedDbAdapter<S> {
  const { logger, migrate, name, onMetrics, schema, signals, validators, version = 1 } = options;

  if (!Number.isInteger(version) || version < 1) {
    throw new RangeError(`[vault] createIndexedDB version must be a positive integer, got ${String(version)}`);
  }

  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`vault:${name}`) : undefined;

  if (!channel && logger) {
    logger.error(`[vault] BroadcastChannel unavailable — cross-tab sync disabled for "${name}"`);
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

              reject(new VaultMigrationError(`migration failed for "${name}"`, { cause: error }));

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
          reject(new Error(`[vault] failed to open "${name}"`, { cause: request.error }));
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
    if (disposed) throw new VaultDisposedError(`"${name}" is disposed`);

    if (!db) await connect();

    if (!db) throw new VaultDisposedError(`"${name}" is disposed`);

    const tableName = String(table);
    const tx = db.transaction(tableName, mode);

    return runIdbTx(tx, `${name}/${tableName}`, () => fn(tx.objectStore(tableName)));
  };

  const requireDb = async (): Promise<IDBDatabase> => {
    if (disposed) throw new VaultDisposedError(`"${name}" is disposed`);

    if (!db) await connect();

    if (!db) throw new VaultDisposedError(`"${name}" is disposed`);

    return db;
  };

  const publish = <K extends keyof S>(table: K): void => {
    channel?.postMessage({ table: String(table) });
  };

  const core: StorageBackend<S> = {
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

    const txCore: StorageBackend<S, K> = {
      clear: async (table) => {
        await idbReq(storeOf(table).clear());
      },
      count: (table) => countLiveRecordsInStore<RecordOf<S, typeof table>>(storeOf(table)),
      delete: (table, key) => storeDelete(storeOf(table), key as IDBValidKey),
      deleteMany: (table, keys) => storeDeleteMany(storeOf(table), keys as IDBValidKey[]),
      get: (table, key) => storeGet<RecordOf<S, typeof table>>(storeOf(table), key as IDBValidKey),
      getAll: (table) => getAllFromStore<RecordOf<S, typeof table>>(storeOf(table)),
      getByKeyRange: (table, range) => getAllFromStoreWithRange<RecordOf<S, typeof table>>(storeOf(table), range),
      getMany: (table, keys) =>
        Promise.all(keys.map((k) => storeGet<RecordOf<S, typeof table>>(storeOf(table), k as IDBValidKey))),
      has: (table, key) => storeHas<RecordOf<S, typeof table>>(storeOf(table), key as IDBValidKey),
      pruneExpiredInTable: (table) => pruneExpiredInStore(storeOf(table)),
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

  const adapter = buildAdapterOps(schema, core, {
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
    schema,
    signals,
    validators,
  });

  /**
   * F1: Attach cursor-based `iterate()` on top of the adapter.
   * Opens a dedicated readonly transaction per call and streams records via IDB cursor —
   * genuinely memory-efficient for large tables unlike the getAll()-then-yield pattern.
   */
  return {
    ...adapter,
    iterate<K extends keyof S>(table: K): AsyncIterable<RecordOf<S, K>> {
      if (disposed) throw new VaultDisposedError(`"${name}" is disposed`);

      // Each call opens a fresh transaction so iteration doesn't hold locks across awaits.
      // We need to ensure the DB is connected before opening the transaction.
      const getIterable = async (): Promise<AsyncIterable<RecordOf<S, K>>> => {
        if (!db) await connect();

        if (!db || disposed) throw new VaultDisposedError(`"${name}" is disposed`);

        const idb = db;
        const tx = idb.transaction(String(table), 'readonly');
        const store = tx.objectStore(String(table));

        return iterateStoreWithCursor<RecordOf<S, K>>(store);
      };

      // Return an AsyncIterable that resolves the inner iterable on first iteration.
      return {
        [Symbol.asyncIterator]() {
          let inner: AsyncIterator<RecordOf<S, K>> | null = null;

          const initInner = (): Promise<AsyncIterator<RecordOf<S, K>>> =>
            getIterable().then((iterable) => {
              inner = iterable[Symbol.asyncIterator]();

              return inner;
            });

          return {
            next(): Promise<IteratorResult<RecordOf<S, K>>> {
              // Sync check avoids an extra Promise allocation on every iteration after the first.
              if (inner) return inner.next();

              return initInner().then((it) => it.next());
            },
            return(value?: unknown): Promise<IteratorResult<RecordOf<S, K>>> {
              if (inner) return inner.return?.(value) ?? Promise.resolve({ done: true, value });

              return Promise.resolve({ done: true, value });
            },
            throw(err?: unknown): Promise<IteratorResult<RecordOf<S, K>>> {
              if (inner) return inner.throw?.(err) ?? Promise.reject(err);

              return Promise.reject(err);
            },
          };
        },
      };
    },
  };
}
