import type {
  Adapter,
  AnySchema,
  BaseAdapterOptions,
  KeyOf,
  MigrationFn,
  RecordOf,
  TransactionContext,
  TtlMs,
} from '../types';

import { buildAdapterOps, buildTxContext, type StorageBackend } from '../adapter-core';
import { VaultDisposedError, VaultError, VaultMigrationError } from '../errors';
import { getRecordKey } from '../internal';
import { type NativeRange } from '../query';
import { defaultCodec, type VaultCodec } from '../ttl';

function idbReq<R>(request: IDBRequest<R>): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new VaultError('IndexedDB request failed'));
  });
}

function wrapTxError(scope: string, message: string, cause: unknown): VaultError {
  const causeMessage = cause instanceof Error && cause.message ? `: ${cause.message}` : '';

  return new VaultError(`${message} on "${scope}"${causeMessage}`, { cause });
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

async function getAllFromStore<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  decode: (raw: unknown) => T | undefined,
): Promise<T[]> {
  const rawRecords = await idbReq<unknown[]>(store.getAll());
  const records: T[] = [];

  for (const raw of rawRecords) {
    const value = decode(raw);

    if (value !== undefined) records.push(value);
  }

  return records;
}

async function getAllFromStoreByIndex<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  indexName: string,
  range: NativeRange,
  decode: (raw: unknown) => T | undefined,
): Promise<T[]> {
  const index = store.index(indexName);
  const idbRange =
    range.type === 'eq'
      ? IDBKeyRange.only(range.value as IDBValidKey)
      : range.type === 'between'
        ? IDBKeyRange.bound(range.lower as IDBValidKey, range.upper as IDBValidKey)
        : IDBKeyRange.bound(range.prefix, range.prefix + '\uffff');
  const rawRecords = await idbReq<unknown[]>(index.getAll(idbRange));
  const records: T[] = [];

  for (const raw of rawRecords) {
    const value = decode(raw);

    if (value !== undefined) records.push(value);
  }

  return records;
}

async function getAllFromStoreWithRange<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  range: NativeRange,
  decode: (raw: unknown) => T | undefined,
): Promise<T[]> {
  if (range.type === 'eq') {
    const record = await storeGet<T>(store, range.value as IDBValidKey, decode);

    return record !== undefined ? [record] : [];
  }

  const idbRange =
    range.type === 'between'
      ? IDBKeyRange.bound(range.lower as IDBValidKey, range.upper as IDBValidKey)
      : // 'starts': bound from prefix to prefix\uffff (covers all BMP strings starting with prefix)
        IDBKeyRange.bound(range.prefix, range.prefix + '\uffff');

  const rawRecords = await idbReq<unknown[]>(store.getAll(idbRange));
  const records: T[] = [];

  for (const raw of rawRecords) {
    const value = decode(raw);

    if (value !== undefined) records.push(value);
  }

  return records;
}

async function storeGet<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  key: IDBValidKey,
  decode: (raw: unknown) => T | undefined,
): Promise<T | undefined> {
  const raw = await idbReq<unknown>(store.get(key));

  if (raw == null) return undefined;

  return decode(raw);
}

async function storeHas<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  key: IDBValidKey,
  decode: (raw: unknown) => T | undefined,
): Promise<boolean> {
  return (await storeGet<T>(store, key, decode)) !== undefined;
}

async function storeDelete<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  key: IDBValidKey,
  decode: (raw: unknown) => T | undefined,
): Promise<boolean> {
  const live = await storeHas<T>(store, key, decode);

  await idbReq(store.delete(key));

  return live;
}

async function storeDeleteMany<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  keys: IDBValidKey[],
  decode: (raw: unknown) => T | undefined,
): Promise<number> {
  if (keys.length === 0) return 0;

  const results = await Promise.all(keys.map((k) => storeDelete<T>(store, k, decode)));

  return results.filter(Boolean).length;
}

async function storePutAt<T>(
  store: IDBObjectStore,
  key: IDBValidKey,
  value: T,
  encode: (v: T, ttl?: TtlMs) => unknown,
  ttl?: TtlMs,
): Promise<void> {
  await idbReq(store.put(encode(value, ttl), key));
}

function pruneExpiredInStore(store: IDBObjectStore, codec: VaultCodec): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let deleted = 0;
    const request = store.openCursor();

    request.onerror = () => reject(request.error ?? new VaultError('IndexedDB cursor failed during prune'));
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve(deleted);

        return;
      }

      const stored = codec.decode(cursor.value as unknown);

      if (!stored || (stored.expiresAt !== undefined && Date.now() >= stored.expiresAt)) {
        cursor.delete();
        deleted += 1;
      }

      cursor.continue();
    };
  });
}

/**
 * Cursor state machine — a single discriminated union replaces five boolean/nullable variables.
 * Transitions: idle → waiting (next() before cursor fires) | buffered (cursor fires first) | done | error
 */
type CursorState<T> =
  | { type: 'idle' }
  | { reject: (e: unknown) => void; resolve: (r: IteratorResult<T>) => void; type: 'waiting' }
  | { result: IteratorResult<T>; type: 'buffered' }
  | { error: unknown; type: 'error' }
  | { type: 'done' };

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
function iterateStoreWithCursor<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  decode: (raw: unknown) => T | undefined,
): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      const cursorRequest = store.openCursor();
      let state: CursorState<T> = { type: 'idle' };

      const deliver = (result: IteratorResult<T>): void => {
        if (state.type === 'waiting') {
          const { resolve } = state;

          state = result.done ? { type: 'done' } : { type: 'idle' };
          resolve(result);
        } else {
          state = { result, type: 'buffered' };
        }
      };

      cursorRequest.onerror = () => {
        const err = cursorRequest.error ?? new VaultError('IndexedDB cursor iteration failed');

        if (state.type === 'waiting') {
          const { reject } = state;

          state = { type: 'done' };
          reject(err);
        } else {
          state = { error: err, type: 'error' };
        }
      };

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;

        if (!cursor) {
          deliver({ done: true, value: undefined });

          return;
        }

        const value = decode(cursor.value as unknown);

        // Advance eagerly BEFORE yielding to keep the IDB transaction alive.
        cursor.continue();

        if (value !== undefined) deliver({ done: false, value });
      };

      return {
        next(): Promise<IteratorResult<T>> {
          if (state.type === 'error') {
            const { error } = state;

            state = { type: 'done' };

            return Promise.reject(error);
          }

          if (state.type === 'buffered') {
            const { result } = state;

            state = result.done ? { type: 'done' } : { type: 'idle' };

            return Promise.resolve(result);
          }

          if (state.type === 'done') return Promise.resolve({ done: true, value: undefined });

          return new Promise<IteratorResult<T>>((resolve, reject) => {
            state = { reject, resolve, type: 'waiting' };
          });
        },

        return(value?: unknown): Promise<IteratorResult<T>> {
          if (state.type === 'waiting') state.resolve({ done: true, value: undefined });

          state = { type: 'done' };

          return Promise.resolve({ done: true, value });
        },

        throw(err?: unknown): Promise<IteratorResult<T>> {
          if (state.type === 'waiting') state.reject(err);

          state = { type: 'done' };

          return Promise.reject(err);
        },
      };
    },
  };
}

/**
 * R3: Extracted IDB batch core — builds a StorageBackend that operates within
 * an existing IDBTransaction, shared by all tables in the batch.
 * Eliminates the duplicated `txCore` block that was previously inlined in `idbBatch`.
 */
function buildIdbBatchCore<S extends AnySchema, K extends keyof S & string>(
  schema: S,
  idbTx: IDBTransaction,
  decode: <T extends Record<string, unknown>>(raw: unknown) => T | undefined,
  encode: <T>(value: T, ttl?: TtlMs) => unknown,
): StorageBackend<S, K> {
  const storeOf = (table: K): IDBObjectStore => idbTx.objectStore(table);

  return {
    clear: async (table) => {
      await idbReq(storeOf(table).clear());
    },
    count: async (table) => {
      // For tables with no TTL, every stored record is live — use native O(1) IDB count.
      // For TTL tables we must inspect each record to exclude expired entries.
      if (!schema[table]?.defaultTtl) {
        return idbReq(storeOf(table).count());
      }

      const all = await idbReq<unknown[]>(storeOf(table).getAll());

      return all.filter((r) => decode(r) !== undefined).length;
    },
    delete: (table, key) => storeDelete<RecordOf<S, K>>(storeOf(table), key as IDBValidKey, decode),
    deleteMany: (table, keys) => storeDeleteMany<RecordOf<S, K>>(storeOf(table), keys as IDBValidKey[], decode),
    get: (table, key) => storeGet<RecordOf<S, typeof table>>(storeOf(table), key as IDBValidKey, decode),
    getAll: (table) => getAllFromStore<RecordOf<S, typeof table>>(storeOf(table), decode),
    getByIndexRange: (table, field, range) =>
      getAllFromStoreByIndex<RecordOf<S, typeof table>>(storeOf(table), field, range, decode),
    getByKeyRange: (table, range) => getAllFromStoreWithRange<RecordOf<S, typeof table>>(storeOf(table), range, decode),
    getMany: (table, keys) =>
      Promise.all(keys.map((k) => storeGet<RecordOf<S, typeof table>>(storeOf(table), k as IDBValidKey, decode))),
    has: (table, key) => storeHas<RecordOf<S, typeof table>>(storeOf(table), key as IDBValidKey, decode),
    pruneExpiredInTable: (table) => pruneExpiredInStore(storeOf(table), { decode, encode }),
    put(table, value, ttl) {
      return storePutAt(storeOf(table), getRecordKey(schema, table, value) as IDBValidKey, value, encode, ttl);
    },
    putAll(table, values, ttl) {
      return Promise.all(
        values.map((v) => storePutAt(storeOf(table), getRecordKey(schema, table, v) as IDBValidKey, v, encode, ttl)),
      ).then(() => undefined);
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
  const {
    codec: userCodec = defaultCodec,
    logger,
    migrate,
    name,
    onMetrics,
    schema,
    signals,
    validators,
    version = 1,
  } = options;

  if (!Number.isInteger(version) || version < 1) {
    throw new VaultError(`createIndexedDB: version must be a positive integer, got ${String(version)}`);
  }

  // F4: Codec-bound encode/decode used throughout the IDB adapter.
  const decode = <T extends Record<string, unknown>>(raw: unknown): T | undefined => {
    const stored = userCodec.decode<T>(raw);

    if (!stored) return undefined;

    if (stored.expiresAt !== undefined && Date.now() >= stored.expiresAt) return undefined;

    return stored.value;
  };

  const encode = <T>(value: T, ttl?: TtlMs): unknown => {
    const expiresAt = ttl !== undefined ? Date.now() + ttl : undefined;

    return userCodec.encode(value, expiresAt);
  };

  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`vault:${name}`) : undefined;

  if (!channel && logger) {
    logger.error(`[vault] BroadcastChannel unavailable — cross-tab sync disabled for "${name}"`);
  }

  let db: IDBDatabase | null = null;
  let connectPromise: Promise<void> | null = null;
  let disposed = false;

  const createObjectStores = (target: IDBDatabase, tx: IDBTransaction): void => {
    for (const [tableName, entry] of Object.entries(schema)) {
      let store: IDBObjectStore;

      if (!target.objectStoreNames.contains(tableName)) {
        store = target.createObjectStore(tableName);
      } else {
        store = tx.objectStore(tableName);
      }

      // F5: Create secondary indexes for fields declared via .index() on the table() builder.
      // Stored format is { value: T, expiresAt?: number } so IDB keyPath is `value.<field>`.
      const indexes = (entry as { indexes?: readonly string[] }).indexes ?? [];

      for (const field of indexes) {
        if (!store.indexNames.contains(field)) {
          store.createIndex(field, `value.${field}`);
        }
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

          createObjectStores(target, tx);
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
          reject(new VaultError(`failed to open "${name}"`, { cause: request.error }));
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
    clear: (table) => withStore(table, 'readwrite', (s) => idbReq(s.clear()).then(() => undefined)),

    count: (table) =>
      withStore(table, 'readonly', async (s) => {
        // Must inspect each stored record to exclude TTL-expired entries.
        // Individual put() calls can attach a TTL even when the schema has no defaultTtl,
        // so schema[table].defaultTtl being absent does not guarantee a clean count.
        const all = await idbReq<unknown[]>(s.getAll());

        return all.filter((r) => decode(r) !== undefined).length;
      }),

    delete: (table, key) =>
      withStore(table, 'readwrite', (s) => storeDelete<RecordOf<S, typeof table>>(s, key as IDBValidKey, decode)),

    deleteMany: (table, keys) =>
      keys.length === 0
        ? Promise.resolve(0)
        : withStore(table, 'readwrite', (s) =>
            storeDeleteMany<RecordOf<S, typeof table>>(s, keys as IDBValidKey[], decode),
          ),

    async dispose(): Promise<void> {
      disposed = true;
      channel?.close();

      // F7: Wait for any in-progress connect before closing the DB to avoid
      // "database connection is closing" errors on in-flight requests.
      if (connectPromise) await connectPromise.catch(() => {});

      db?.close();
      db = null;
      connectPromise = null;
    },

    get: (table, key) =>
      withStore(table, 'readonly', (s) => storeGet<RecordOf<S, typeof table>>(s, key as IDBValidKey, decode)),

    getAll: (table) => withStore(table, 'readonly', (s) => getAllFromStore<RecordOf<S, typeof table>>(s, decode)),

    // R1: Fast key-only fetch via store.getAllKeys(). For tables with schema-level TTL
    // we fall back to full record fetch to correctly exclude expired entries.
    getAllKeys: (table) =>
      withStore(table, 'readonly', async (s) => {
        if (schema[table].defaultTtl) {
          // TTL table: must check each record for expiry — keys() still O(n).
          const records = await getAllFromStore<RecordOf<S, typeof table>>(s, decode);
          const keyField = schema[table].key;

          return records.map((r) => (r as Record<string, unknown>)[keyField] as KeyOf<S, typeof table>);
        }

        // Non-TTL table: store.getAllKeys() is O(1) IDB engine call.
        return idbReq<IDBValidKey[]>(s.getAllKeys()).then((keys) => keys as KeyOf<S, typeof table>[]);
      }),

    getByIndexRange: (table, field, range) =>
      withStore(table, 'readonly', (s) => getAllFromStoreByIndex<RecordOf<S, typeof table>>(s, field, range, decode)),

    getByKeyRange: (table, range) =>
      withStore(table, 'readonly', (s) => getAllFromStoreWithRange<RecordOf<S, typeof table>>(s, range, decode)),

    getMany: (table, keys) =>
      keys.length === 0
        ? Promise.resolve([])
        : withStore(table, 'readonly', (s) =>
            Promise.all(keys.map((k) => storeGet<RecordOf<S, typeof table>>(s, k as IDBValidKey, decode))),
          ),

    getRawCount: (table) => withStore(table, 'readonly', (s) => idbReq(s.count())),

    has: (table, key) =>
      withStore(table, 'readonly', (s) => storeHas<RecordOf<S, typeof table>>(s, key as IDBValidKey, decode)),

    async pruneAllExpired() {
      const idb = await requireDb();
      const tableNames = Object.keys(schema);
      const tx = idb.transaction(tableNames, 'readwrite');
      const results = await runIdbTx(tx, `${name}/pruneAll`, () =>
        Promise.all(tableNames.map(async (t) => [t, await pruneExpiredInStore(tx.objectStore(t), userCodec)] as const)),
      );

      return Object.fromEntries(results);
    },

    pruneExpiredInTable: (table) => withStore(table, 'readwrite', (s) => pruneExpiredInStore(s, userCodec)),

    put(table, value, ttl) {
      const key = getRecordKey(schema, table, value) as IDBValidKey;

      return withStore(table, 'readwrite', (s) => storePutAt(s, key, value, encode, ttl));
    },

    putAll(table, values, ttl) {
      return withStore(table, 'readwrite', (s) =>
        Promise.all(
          values.map((v) => storePutAt(s, getRecordKey(schema, table, v) as IDBValidKey, v, encode, ttl)),
        ).then(() => undefined),
      );
    },
  };

  const idbBatch = async <K extends keyof S & string, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
    notifyMutation: (table: K) => void,
    validateFn: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  ): Promise<R> => {
    const idb = await requireDb();
    const idbTx = idb.transaction([...tables] as string[], 'readwrite');
    const dirtyTables = new Set<K>();

    const txCore = buildIdbBatchCore<S, K>(schema, idbTx, decode, encode);
    const scope = new Set<string>(tables);
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

        if (!tableName || !(tableName in schema)) return;

        notify(tableName as keyof S & string);
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

        return iterateStoreWithCursor<RecordOf<S, K>>(store, decode as (raw: unknown) => RecordOf<S, K> | undefined);
      };

      let inner: AsyncIterator<RecordOf<S, K>> | undefined;

      const initInner = (): Promise<AsyncIterator<RecordOf<S, K>>> =>
        getIterable().then((iterable) => {
          inner = iterable[Symbol.asyncIterator]();

          return inner;
        });

      return {
        [Symbol.asyncIterator](): AsyncIterator<RecordOf<S, K>> {
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
