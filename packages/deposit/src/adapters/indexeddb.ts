import type { AnySchema, IndexedDBHandle, KeyOf, MigrationFn, RecordOf, TtlMs, TransactionContext } from '../types';

import { createAdapterRuntime, createTransactionContext } from '../adapter-core';
import { parseStored, wrapStored, unwrapStored } from '../ttl';

function idbReq<R>(request: IDBRequest<R>): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('deposit: IndexedDB request failed'));
  });
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
        reject(new Error(`deposit: transaction on "${scope}" failed`, { cause: callbackError }));

        return;
      }

      resolve(result as T);
    };
    tx.onerror = () => reject(new Error(`deposit: transaction error on "${scope}"`, { cause: tx.error }));
    tx.onabort = () =>
      reject(new Error(`deposit: transaction on "${scope}" was aborted`, { cause: callbackError ?? tx.error }));
  });
}

async function deleteWhereInStore<T extends Record<string, unknown>>(
  store: IDBObjectStore,
  predicate: (record: T) => boolean,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let count = 0;
    const request = store.openCursor();

    request.onerror = () => reject(request.error ?? new Error('deposit: IndexedDB cursor request failed'));
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve(count);

        return;
      }

      const parsed = parseStored<T>(cursor.value as unknown);

      if (!parsed) {
        const deleteRequest = cursor.delete();

        deleteRequest.onerror = () =>
          reject(deleteRequest.error ?? new Error('deposit: IndexedDB delete request failed'));
        deleteRequest.onsuccess = () => {
          cursor.continue();
        };

        return;
      }

      const value = unwrapStored(parsed);

      if (value === undefined || predicate(value)) {
        const deleteRequest = cursor.delete();

        deleteRequest.onerror = () =>
          reject(deleteRequest.error ?? new Error('deposit: IndexedDB delete request failed'));
        deleteRequest.onsuccess = () => {
          if (value !== undefined) count += 1;

          cursor.continue();
        };

        return;
      }

      cursor.continue();
    };
  });
}

async function scanStoreWithCursor<T extends Record<string, unknown>>(store: IDBObjectStore): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const records: T[] = [];
    const request = store.openCursor();

    request.onerror = () => reject(request.error ?? new Error('deposit: IndexedDB cursor request failed'));
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve(records);

        return;
      }

      const parsed = parseStored<T>(cursor.value as unknown);

      if (!parsed) {
        cursor.continue();

        return;
      }

      const value = unwrapStored(parsed);

      if (value !== undefined) {
        records.push(value);
        cursor.continue();

        return;
      }

      cursor.continue();
    };
  });
}

export function createIndexedDB<S extends AnySchema>(options: {
  dbName: string;
  migrate?: MigrationFn;
  schema: S;
  schemaVersion: number;
}): IndexedDBHandle<S> {
  const { dbName, migrate, schema, schemaVersion } = options;
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`deposit:${dbName}`) : undefined;
  let db: IDBDatabase | null = null;
  let connectPromise: Promise<void> | null = null;
  let disposed = false;

  const createObjectStores = (target: IDBDatabase): void => {
    for (const [name, definition] of Object.entries(schema)) {
      if (!target.objectStoreNames.contains(name)) {
        target.createObjectStore(name, { keyPath: `v.${definition.key}` });
      }
    }
  };

  const connect = async (): Promise<void> => {
    if (!connectPromise) {
      connectPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, schemaVersion);

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

              reject(new Error(`deposit: migration failed for "${dbName}"`, { cause: error }));

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
          reject(new Error(`deposit: failed to open "${dbName}"`, { cause: request.error }));
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
    if (disposed) throw new Error(`deposit: "${dbName}" is disposed`);

    if (!db) await connect();

    if (!db) throw new Error(`deposit: "${dbName}" is disposed`);

    const name = String(table);
    const tx = db.transaction(name, mode);

    return runIdbTx(tx, `${dbName}/${name}`, () => fn(tx.objectStore(name)));
  };

  const publish = <K extends keyof S>(table: K): void => {
    channel?.postMessage({ table: String(table) });
  };

  const assertRecordKey = <K extends keyof S>(table: K, value: RecordOf<S, K>): void => {
    const keyField = String(schema[table].key);
    const keyValue = (value as Record<string, unknown>)[keyField];

    if (keyValue === undefined || keyValue === null) {
      throw new Error(`deposit: missing required key field "${keyField}" in record for table "${String(table)}"`);
    }
  };

  const runtime = createAdapterRuntime(
    schema,
    {
      async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
        const deleted = await withStore(table, 'readwrite', async (store) => {
          const raw = await idbReq<unknown>(store.get(key as IDBValidKey));

          if (raw == null) return false;

          await idbReq(store.delete(key as IDBValidKey));

          return true;
        });

        return deleted;
      },
      async deleteAll<K extends keyof S>(table: K): Promise<number> {
        return withStore(table, 'readwrite', async (store) => {
          const deleted = await idbReq(store.count());

          await idbReq(store.clear());

          return deleted;
        });
      },
      async deleteWhere<K extends keyof S>(table: K, predicate: (record: RecordOf<S, K>) => boolean): Promise<number> {
        return withStore(table, 'readwrite', (store) => deleteWhereInStore<RecordOf<S, K>>(store, predicate));
      },
      dispose() {
        disposed = true;
        db?.close();
        db = null;
        connectPromise = null;
        channel?.close();
      },
      async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
        const idbKey = key as IDBValidKey;
        const raw = await withStore(table, 'readonly', (store) => idbReq<unknown>(store.get(idbKey)));

        if (raw == null) return undefined;

        const parsed = parseStored<RecordOf<S, K>>(raw);

        if (!parsed) return undefined;

        const value = unwrapStored(parsed);
        return value;
      },
      async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
        return withStore(table, 'readonly', (store) => scanStoreWithCursor<RecordOf<S, K>>(store));
      },
      async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void> {
        assertRecordKey(table, value);

        await withStore(table, 'readwrite', (store) => idbReq(store.put(wrapStored(value, ttl))).then(() => undefined));
      },
      async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
        await withStore(table, 'readwrite', async (store) => {
          await Promise.all(
            values.map((value) => {
              assertRecordKey(table, value);

              return idbReq(store.put(wrapStored(value, ttl)));
            }),
          );
        });
      },
    },
    { broadcast: publish },
  );

  if (channel) {
    channel.onmessage = (event: MessageEvent<{ table?: string }>) => {
      const tableName = event.data?.table;

      if (!tableName) return;

      runtime.notify(tableName as keyof S);
    };
  }

  const handle: IndexedDBHandle<S> = {
    ...runtime.adapter,
    async transaction<K extends keyof S, R>(
      tables: readonly K[],
      fn: (tx: TransactionContext<S, K>) => Promise<R>,
    ): Promise<R> {
      if (disposed) throw new Error(`deposit: "${dbName}" is disposed`);

      if (!db) await connect();

      if (!db) throw new Error(`deposit: "${dbName}" is disposed`);

      const idbTx = db.transaction(tables.map(String), 'readwrite');
      const storeOf = <T extends K>(table: T) => idbTx.objectStore(String(table));
      const dirtyTables = new Set<K>();
      const markDirty = <T extends K>(table: T): void => {
        dirtyTables.add(table);
      };
      const txCore = {
        async delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean> {
          const store = storeOf(table);
          const raw = await idbReq<unknown>(store.get(key as IDBValidKey));

          if (raw == null) return false;

          await idbReq(store.delete(key as IDBValidKey));
          markDirty(table);

          return true;
        },
        async deleteAll<T extends K>(table: T): Promise<number> {
          const store = storeOf(table);
          const deleted = await idbReq(store.count());

          await idbReq(store.clear());

          if (deleted > 0) markDirty(table);

          return deleted;
        },
        async deleteWhere<T extends K>(table: T, predicate: (record: RecordOf<S, T>) => boolean): Promise<number> {
          const deleted = await deleteWhereInStore<RecordOf<S, T>>(storeOf(table), predicate);

          if (deleted > 0) markDirty(table);

          return deleted;
        },
        async get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined> {
          const store = storeOf(table);
          const raw = await idbReq<unknown>(store.get(key as IDBValidKey));

          if (raw == null) return undefined;

          const parsed = parseStored<RecordOf<S, T>>(raw);

          if (!parsed) return undefined;

          const value = unwrapStored(parsed);
          return value;
        },
        async getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]> {
          return scanStoreWithCursor<RecordOf<S, T>>(storeOf(table));
        },
        async put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<void> {
          assertRecordKey(table, value);

          await idbReq(storeOf(table).put(wrapStored(value, ttl)));
          markDirty(table);
        },
        async putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: TtlMs): Promise<void> {
          await Promise.all(
            values.map((value) => {
              assertRecordKey(table, value);

              return idbReq(storeOf(table).put(wrapStored(value, ttl)));
            }),
          );

          if (values.length > 0) markDirty(table);
        },
      };
      const tx = createTransactionContext<S, K>(schema, txCore);
      const result = await runIdbTx(idbTx, dbName, () => fn(tx));

      for (const table of dirtyTables) {
        runtime.notifyMutation(table);
      }

      return result;
    },
  };

  return handle;
}
