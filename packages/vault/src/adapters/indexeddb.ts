/// <reference lib="dom" />

import {
  assertBatchTables,
  type BatchImpl,
  buildDocumentStore,
  buildTxContext,
  type StorageBackend,
  withBatch,
} from '../adapter-core';
import { decodeRecord, encodeRecord } from '../codec';
import { VaultDisposedError, VaultError, VaultMigrationError } from '../errors';
import { encodeVaultKey, getRecordKey } from '../internal';
import { isExpired, parseStored, type StoredRecord } from '../ttl';
import type { AnySchema, DocumentVaultStore, DurableStoreOptions, RecordOf, TransactionContext } from '../types';

/** IndexedDB-only migration context supplied to `MigrationFn` during `onupgradeneeded`. */
export type MigrationContext = {
  db: IDBDatabase;
  newVersion: number | null;
  oldVersion: number;
  tx: IDBTransaction;
};

/** Synchronous IndexedDB schema upgrade callback. */
export type MigrationFn = (ctx: MigrationContext) => void;

/**
 * A single step in a typed migration definition.
 * Compose multiple steps to describe the full schema change between two versions.
 */
export type MigrationStep =
  | { field: string; table: string; type: 'addIndex' }
  | { field: string; table: string; type: 'removeIndex' }
  | { name: string; type: 'addTable' }
  | { name: string; type: 'removeTable' };

/**
 * Builds a typed `MigrationFn` from a declarative list of schema change steps.
 * Each step is applied in order and is idempotent (safe to run when the target
 * already exists or has already been removed).
 *
 * ```ts
 * const migrate = defineMigration([
 *   { type: 'addTable', name: 'sessions' },
 *   { type: 'addIndex', table: 'users', field: 'email' },
 *   { type: 'removeTable', name: 'legacyTokens' },
 * ]);
 *
 * const db = createIndexedDB({ name: 'app', version: 2, schema, codecs, migrate });
 * ```
 */
export function defineMigration(steps: MigrationStep[]): MigrationFn {
  return ({ db, tx }) => {
    for (const step of steps) {
      switch (step.type) {
        case 'addIndex': {
          const store = tx.objectStore(step.table);

          // keyPath mirrors the vault storage envelope: { value: T, expiresAt?: number }
          if (!store.indexNames.contains(step.field)) {
            store.createIndex(step.field, `value.${step.field}`);
          }

          break;
        }
        case 'addTable':
          if (!db.objectStoreNames.contains(step.name)) {
            db.createObjectStore(step.name);
          }

          break;
        case 'removeIndex': {
          const store = tx.objectStore(step.table);

          if (store.indexNames.contains(step.field)) {
            store.deleteIndex(step.field);
          }

          break;
        }
        case 'removeTable':
          if (db.objectStoreNames.contains(step.name)) {
            db.deleteObjectStore(step.name);
          }

          break;
      }
    }
  };
}

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

async function getAllFromStore<T extends object>(
  store: IDBIndex | IDBObjectStore,
  decode: (raw: unknown) => T | undefined,
  query?: IDBValidKey | IDBKeyRange,
): Promise<T[]> {
  const rawRecords = await idbReq<unknown[]>(store.getAll(query));
  const records: T[] = [];

  for (const raw of rawRecords) {
    const value = decode(raw);

    if (value !== undefined) records.push(value);
  }

  return records;
}

async function storeGet<T extends object>(
  store: IDBObjectStore,
  key: IDBValidKey,
  decode: (raw: unknown) => T | undefined,
): Promise<T | undefined> {
  const raw = await idbReq<unknown>(store.get(key));

  if (raw == null) return undefined;

  return decode(raw);
}

async function storeDelete<T extends object>(
  store: IDBObjectStore,
  key: IDBValidKey,
  decode: (raw: unknown) => T | undefined,
): Promise<boolean> {
  const live = (await storeGet<T>(store, key, decode)) !== undefined;

  await idbReq(store.delete(key));

  return live;
}

async function storeDeleteMany<T extends object>(
  store: IDBObjectStore,
  keys: readonly IDBValidKey[],
  decode: (raw: unknown) => T | undefined,
): Promise<number> {
  const results = await Promise.all(keys.map((key) => storeDelete(store, key, decode)));
  return results.filter(Boolean).length;
}

function pruneExpiredInStore(store: IDBObjectStore): Promise<number> {
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

      const stored = parseStored(cursor.value as unknown);

      if (!stored || isExpired(stored.expiresAt)) {
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
  | { results: IteratorResult<T>[]; type: 'buffered' }
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
function iterateStoreWithCursor<T extends object>(
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
        } else if (state.type === 'buffered') {
          state.results.push(result);
        } else {
          state = { results: [result], type: 'buffered' };
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
        if (state.type === 'done') return;
        const cursor = cursorRequest.result;

        if (!cursor) {
          deliver({ done: true, value: undefined });

          return;
        }

        let value: T | undefined;
        try {
          value = decode(cursor.value as unknown);
        } catch (error) {
          if (state.type === 'waiting') {
            const { reject } = state;
            state = { type: 'done' };
            reject(error);
          } else {
            state = { error, type: 'error' };
          }
          return;
        }

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
            const [result, ...results] = state.results;

            state = result.done
              ? { type: 'done' }
              : results.length > 0
                ? { results, type: 'buffered' }
                : { type: 'idle' };

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

export interface IndexedDbVaultStore<S extends AnySchema> extends DocumentVaultStore<S> {
  getAllByIndex<K extends keyof S & string, Field extends keyof RecordOf<S, K> & string>(
    table: K,
    field: Field,
    value: RecordOf<S, K>[Field],
  ): Promise<RecordOf<S, K>[]>;
}

type IndexedDbOptions<S extends AnySchema> = DurableStoreOptions<S> & {
  migrate?: MigrationFn;
  name: string;
  /** Schema version. Must be a positive integer. Increment when adding tables or changing the schema, then provide `migrate`. Defaults to 1. */
  version?: number;
};

export function createIndexedDB<S extends AnySchema>(options: IndexedDbOptions<S>): IndexedDbVaultStore<S> {
  const { migrate, name, schema, codecs, version = 1 } = options;

  if (!codecs) {
    throw new VaultError('createIndexedDB: codecs are required for durable persistence');
  }

  if (!Number.isInteger(version) || version < 1) {
    throw new VaultError(`createIndexedDB: version must be a positive integer, got ${String(version)}`);
  }

  // Fixed envelopes keep IndexedDB records and `value.<field>` indexes portable across adapters.
  // Table-aware codec encode/decode is applied in the backend methods below.

  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`vault:${name}`) : undefined;

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

  // Table-aware decode: unwrap envelope + apply codec.decode
  const decodeWithCodec = <T extends object>(table: keyof S, raw: unknown): T | undefined => {
    const stored = parseStored<unknown>(raw);

    if (!stored || isExpired(stored.expiresAt)) return undefined;

    try {
      return decodeRecord(codecs[table], stored.value) as unknown as T;
    } catch (err) {
      throw new VaultError(`validation failed for table "${String(table)}"`, { cause: err });
    }
  };

  // Table-aware encode: apply codec.encode + wrap in envelope
  const encodeWithCodec = <T>(table: keyof S, value: T, ttl?: number): StoredRecord<unknown> => {
    const record = value as RecordOf<S, typeof table>;
    const encoded = encodeRecord(codecs[table], record);

    for (const field of schema[table].indexes ?? []) {
      const indexedValue = (record as Record<string, unknown>)[field];
      if (indexedValue === undefined) continue;

      if (
        typeof encoded !== 'object' ||
        encoded === null ||
        !Object.hasOwn(encoded, field) ||
        !Object.is((encoded as Record<string, unknown>)[field], indexedValue)
      ) {
        throw new VaultError(`codec output for table "${String(table)}" must preserve indexed field "${field}"`);
      }
    }

    return ttl === undefined ? { value: encoded } : { expiresAt: Date.now() + ttl, value: encoded };
  };

  const core: StorageBackend<S> = {
    clear: (table) => withStore(table, 'readwrite', (s) => idbReq(s.clear()).then(() => undefined)),

    delete: (table, key) =>
      withStore(table, 'readwrite', (s) => {
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);

        return storeDelete<RecordOf<S, typeof table>>(s, encodeVaultKey(key), decode);
      }),

    deleteMany: (table, keys) =>
      withStore(table, 'readwrite', (s) => {
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);
        return storeDeleteMany<RecordOf<S, typeof table>>(s, keys.map(encodeVaultKey), decode);
      }),

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
      withStore(table, 'readonly', (s) => {
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);

        return storeGet<RecordOf<S, typeof table>>(s, encodeVaultKey(key), decode);
      }),

    getAll: (table) =>
      withStore(table, 'readonly', (s) => {
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);

        return getAllFromStore<RecordOf<S, typeof table>>(s, decode);
      }),

    getMany: (table, keys) =>
      withStore(table, 'readonly', (s) => {
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);
        return Promise.all(keys.map((key) => storeGet<RecordOf<S, typeof table>>(s, encodeVaultKey(key), decode)));
      }),

    iterate: (table) => {
      // Each call opens a fresh transaction so iteration doesn't hold locks across awaits.
      const getIterable = async (): Promise<AsyncIterable<RecordOf<S, typeof table>>> => {
        if (disposed) throw new VaultDisposedError(`"${name}" is disposed`);

        if (!db) await connect();

        if (!db || disposed) throw new VaultDisposedError(`"${name}" is disposed`);

        const idb = db;
        const tx = idb.transaction(String(table), 'readonly');
        const store = tx.objectStore(String(table));
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);

        return iterateStoreWithCursor<RecordOf<S, typeof table>>(
          store,
          decode as (raw: unknown) => RecordOf<S, typeof table> | undefined,
        );
      };

      let inner: AsyncIterator<RecordOf<S, typeof table>> | undefined;

      const initInner = (): Promise<AsyncIterator<RecordOf<S, typeof table>>> =>
        getIterable().then((iterable) => {
          inner = iterable[Symbol.asyncIterator]();

          return inner;
        });

      return {
        [Symbol.asyncIterator](): AsyncIterator<RecordOf<S, typeof table>> {
          return {
            next(): Promise<IteratorResult<RecordOf<S, typeof table>>> {
              if (inner) return inner.next();

              return initInner().then((it) => it.next());
            },
            return(value?: unknown): Promise<IteratorResult<RecordOf<S, typeof table>>> {
              if (inner) return inner.return?.(value) ?? Promise.resolve({ done: true, value });

              return Promise.resolve({ done: true, value });
            },
            throw(err?: unknown): Promise<IteratorResult<RecordOf<S, typeof table>>> {
              if (inner) return inner.throw?.(err) ?? Promise.reject(err);

              return Promise.reject(err);
            },
          };
        },
      };
    },

    async pruneAllExpired() {
      const idb = await requireDb();
      const tableNames = Object.keys(schema);
      const tx = idb.transaction(tableNames, 'readwrite');
      const results = await runIdbTx(tx, `${name}/pruneAll`, () =>
        Promise.all(tableNames.map(async (t) => [t, await pruneExpiredInStore(tx.objectStore(t))] as const)),
      );

      return Object.fromEntries(results);
    },

    pruneExpiredInTable: (table) => withStore(table, 'readwrite', (s) => pruneExpiredInStore(s)),

    put(table, value, ttl) {
      const key = encodeVaultKey(getRecordKey(schema, table, value));
      const encoded = encodeWithCodec(table, value, ttl);

      return withStore(table, 'readwrite', (s) => idbReq(s.put(encoded, key)).then(() => undefined));
    },

    putAll(table, values, ttl) {
      const encodedValues = values.map((v) => {
        const key = encodeVaultKey(getRecordKey(schema, table, v));

        return { encoded: encodeWithCodec(table, v, ttl), key };
      });

      return withStore(table, 'readwrite', (s) =>
        Promise.all(encodedValues.map(({ encoded, key }) => idbReq(s.put(encoded, key)))).then(() => undefined),
      );
    },
  };

  const idbBatch = async <K extends keyof S & string, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
    notifyMutation: (table: K) => void,
    validateFn: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  ): Promise<R> => {
    assertBatchTables(tables);

    const idb = await requireDb();
    const idbTx = idb.transaction([...tables] as string[], 'readwrite');
    const dirtyTables = new Set<K>();
    const storeOf = (table: K): IDBObjectStore => idbTx.objectStore(table);

    const batchCore: StorageBackend<S, K> = {
      clear: async (table) => {
        await idbReq(storeOf(table).clear());
      },
      delete: (table, key) => {
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);

        return storeDelete<RecordOf<S, K>>(storeOf(table), encodeVaultKey(key), decode);
      },
      deleteMany: (table, keys) => {
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);
        return storeDeleteMany<RecordOf<S, K>>(storeOf(table), keys.map(encodeVaultKey), decode);
      },
      get: (table, key) => {
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);

        return storeGet<RecordOf<S, typeof table>>(storeOf(table), encodeVaultKey(key), decode);
      },
      getAll: (table) => {
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);

        return getAllFromStore<RecordOf<S, typeof table>>(storeOf(table), decode);
      },
      getMany: (table, keys) => {
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);
        const store = storeOf(table);
        return Promise.all(keys.map((key) => storeGet<RecordOf<S, typeof table>>(store, encodeVaultKey(key), decode)));
      },
      iterate(table) {
        const decode = <T extends object>(raw: unknown): T | undefined => decodeWithCodec<T>(table, raw);

        return iterateStoreWithCursor<RecordOf<S, typeof table>>(
          storeOf(table),
          decode as (raw: unknown) => RecordOf<S, typeof table> | undefined,
        );
      },
      pruneExpiredInTable: (table) => pruneExpiredInStore(storeOf(table)),
      put(table, value, ttl) {
        const key = encodeVaultKey(getRecordKey(schema, table, value));
        const encoded = encodeWithCodec(table, value, ttl);

        return idbReq(storeOf(table).put(encoded, key)).then(() => undefined);
      },
      putAll(table, values, ttl) {
        return Promise.all(
          values.map((v) => {
            const key = encodeVaultKey(getRecordKey(schema, table, v));
            const encoded = encodeWithCodec(table, v, ttl);

            return idbReq(storeOf(table).put(encoded, key));
          }),
        ).then(() => undefined);
      },
    };

    const scope = new Set<string>(tables);
    let contextActive = true;
    const tx = buildTxContext<S, K>(
      schema,
      batchCore,
      (t) => dirtyTables.add(t),
      validateFn,
      scope,
      () => contextActive,
    );

    try {
      const result = await runIdbTx(idbTx, name, () => fn(tx));

      for (const table of dirtyTables) notifyMutation(table);

      return result;
    } finally {
      contextActive = false;
    }
  };

  let batch: BatchImpl<S> | undefined;
  const adapter = buildDocumentStore(schema, core, {
    codecs,
    onCrossTabMessage(notify) {
      if (!channel) {
        return undefined;
      }

      channel.onmessage = (event: MessageEvent<{ table?: string }>) => {
        const tableName = event.data?.table;

        if (!tableName || !Object.hasOwn(schema, tableName)) return;

        notify(tableName as keyof S & string);
      };

      return () => {
        channel.onmessage = null;
      };
    },
    onMutation: publish,
    onTransactions: (deps) => {
      batch = (tables, fn) => idbBatch(tables, fn, deps.notifyMutation, deps.validate);
    },
    schema,
  });

  if (!batch) throw new VaultError('IndexedDB transaction capability was not initialized');

  return Object.assign(withBatch(adapter, batch, schema), {
    getAllByIndex<K extends keyof S & string, Field extends keyof RecordOf<S, K> & string>(
      table: K,
      field: Field,
      value: RecordOf<S, K>[Field],
    ): Promise<RecordOf<S, K>[]> {
      return withStore(table, 'readonly', (store) => {
        if (!store.indexNames.contains(field)) throw new VaultError(`Table "${table}" has no index "${field}"`);

        const decode = (raw: unknown): RecordOf<S, K> | undefined => decodeWithCodec<RecordOf<S, K>>(table, raw);
        return getAllFromStore(store.index(field), decode, value as IDBValidKey);
      });
    },
  });
}
