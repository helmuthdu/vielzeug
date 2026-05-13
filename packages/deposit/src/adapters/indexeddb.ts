import type { AnySchema, IndexedDBHandle, KeyOf, MigrationFn, RecordOf, TransactionContext } from '../types';

import { createObserverHub, ensureRecordKey, resolveRecordKey } from '../internal';
import { createQueryBuilder } from '../query';
import { type StoredRecord, unwrapStored, wrapStored } from '../ttl';

/* -------------------- Module-level IDB helpers -------------------- */

function idbReq<R>(req: IDBRequest<R>): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('deposit: IndexedDB request failed'));
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
      .catch((err) => {
        callbackError = err;

        try {
          tx.abort();
        } catch {
          /* ignore */
        }
      });

    tx.oncomplete = () =>
      callbackError
        ? reject(new Error(`deposit: transaction on "${scope}" failed`, { cause: callbackError }))
        : resolve(result as T);
    tx.onerror = () => reject(new Error(`deposit: transaction error on "${scope}"`, { cause: tx.error }));
    tx.onabort = () => {
      reject(
        new Error(`deposit: transaction on "${scope}" was aborted`, {
          cause: callbackError ?? tx.error,
        }),
      );
    };
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

      const raw = cursor.value as StoredRecord<T>;
      const value = unwrapStored(raw);

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

async function scanStore<T extends Record<string, unknown>>(
  store: IDBObjectStore,
): Promise<{ expiredKeys: IDBValidKey[]; records: T[] }> {
  const [raws, keys] = await Promise.all([
    idbReq<StoredRecord<T>[]>(store.getAll()),
    idbReq<IDBValidKey[]>(store.getAllKeys()),
  ]);
  const expiredKeys: IDBValidKey[] = [];
  const records: T[] = [];

  for (let index = 0; index < raws.length; index += 1) {
    const value = unwrapStored(raws[index]);

    if (value !== undefined) {
      records.push(value);
    } else {
      expiredKeys.push(keys[index]);
    }
  }

  return { expiredKeys, records };
}

/* -------------------- IndexedDBAdapter -------------------- */

class IndexedDBAdapter<S extends AnySchema> implements IndexedDBHandle<S> {
  private readonly channel?: BroadcastChannel;
  private readonly dbName: string;
  private db: IDBDatabase | null = null;
  private readonly migrate?: MigrationFn;
  private readonly observers = createObserverHub<S>((table) => this.getAll(table));
  private readonly schema: S;
  private readonly schemaVersion: number;
  private connectPromise: Promise<void> | null = null;
  private closed = false;

  constructor(options: { dbName: string; migrate?: MigrationFn; schema: S; schemaVersion: number }) {
    this.dbName = options.dbName;
    this.migrate = options.migrate;
    this.schema = options.schema;
    this.schemaVersion = options.schemaVersion;

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(`deposit:${this.dbName}`);
      this.channel.onmessage = (event: MessageEvent<{ table: string }>) => {
        this.observers.notify(event.data.table as keyof S);
      };
    }
  }

  observe<K extends keyof S>(
    table: K,
    listener: (records: RecordOf<S, K>[]) => void,
    options?: { immediate?: boolean },
  ): () => void {
    return this.observers.observe(table, listener, options);
  }

  dispose(): void {
    this.observers.dispose();
    this.close();
  }

  close(): void {
    this.closed = true;
    this.db?.close();
    this.db = null;
    this.connectPromise = null;
    this.channel?.close();
  }

  private async connect(): Promise<void> {
    if (!this.connectPromise) {
      this.connectPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.schemaVersion);

        request.onupgradeneeded = (event) => {
          const db = request.result;
          const tx = request.transaction!;

          if (this.migrate) {
            try {
              this.migrate({
                db,
                newVersion: (event as IDBVersionChangeEvent).newVersion ?? null,
                oldVersion: event.oldVersion,
                tx,
              });
            } catch (err) {
              try {
                tx.abort();
              } catch {
                /* ignore */
              }

              reject(new Error(`deposit: migration failed for "${this.dbName}"`, { cause: err }));

              return;
            }
          }

          this.createObjectStores(db);
        };

        request.onsuccess = () => {
          if (this.closed) {
            request.result.close();
            resolve();

            return;
          }

          this.db = request.result;
          resolve();
        };

        request.onerror = () => {
          this.connectPromise = null;
          reject(new Error(`deposit: failed to open "${this.dbName}"`, { cause: request.error }));
        };
      });
    }

    return this.connectPromise;
  }

  async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
    const value = await this.withStore(table, 'readonly', async (store) => {
      const raw = await idbReq<StoredRecord<RecordOf<S, K>> | undefined>(store.get(key as IDBValidKey));

      if (raw == null) return undefined;

      return unwrapStored(raw);
    });

    if (value !== undefined) return value;

    await this.withStore(table, 'readwrite', async (store) => {
      const raw = await idbReq<StoredRecord<RecordOf<S, K>> | undefined>(store.get(key as IDBValidKey));

      if (raw == null) return;

      if (unwrapStored(raw) !== undefined) return;

      await idbReq(store.delete(key as IDBValidKey));
    });

    return undefined;
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
    const scanned = await this.withStore(table, 'readonly', (store) => scanStore<RecordOf<S, K>>(store));

    if (scanned.expiredKeys.length > 0) {
      await this.withStore(table, 'readwrite', async (store) => {
        for (const key of scanned.expiredKeys) {
          const raw = await idbReq<StoredRecord<RecordOf<S, K>> | undefined>(store.get(key));

          if (raw == null) continue;

          if (unwrapStored(raw) !== undefined) continue;

          await idbReq(store.delete(key));
        }
      });
    }

    return scanned.records;
  }

  async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void> {
    const key = resolveRecordKey(this.schema, table, value) as IDBValidKey;

    await this.withStore(table, 'readwrite', (store) => idbReq(store.put(wrapStored(value, ttl), key)));
    this.broadcast(table);
  }

  async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: number): Promise<void> {
    await this.withStore(table, 'readwrite', async (store) => {
      await Promise.all(
        values.map((value) => {
          const key = resolveRecordKey(this.schema, table, value) as IDBValidKey;

          return idbReq(store.put(wrapStored(value, ttl), key));
        }),
      );
    });

    this.broadcast(table);
  }

  async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => idbReq(store.delete(key as IDBValidKey)));
    this.broadcast(table);
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => idbReq<undefined>(store.clear()));
    this.broadcast(table);
  }

  async deleteWhere<K extends keyof S>(table: K, predicate: (record: RecordOf<S, K>) => boolean): Promise<number> {
    const deleted = await this.withStore(table, 'readwrite', (store) =>
      deleteWhereInStore<RecordOf<S, K>>(store, predicate),
    );

    if (deleted > 0) this.broadcast(table);

    return deleted;
  }

  async forEach<K extends keyof S>(table: K, fn: (record: RecordOf<S, K>) => void | Promise<void>): Promise<void> {
    const all = await this.getAll(table);

    for (const record of all) {
      await fn(record);
    }
  }

  async has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
    return (await this.get(table, key)) !== undefined;
  }

  async count<K extends keyof S>(table: K): Promise<number> {
    return (await this.getAll(table)).length;
  }

  async getOrPut<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    fallback: RecordOf<S, K> | (() => RecordOf<S, K>),
    ttl?: number,
  ): Promise<RecordOf<S, K>> {
    const existing = await this.get(table, key);

    if (existing) return existing;

    const value = typeof fallback === 'function' ? fallback() : fallback;

    ensureRecordKey(this.schema, table, key, value, 'getOrPut');

    await this.put(table, value, ttl);

    return value;
  }

  async update<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    changes: Partial<RecordOf<S, K>>,
    ttl?: number,
  ): Promise<RecordOf<S, K> | undefined> {
    const current = await this.get(table, key);

    if (!current) return undefined;

    const merged = { ...current, ...changes } as RecordOf<S, K>;

    ensureRecordKey(this.schema, table, key, merged, 'update');

    await this.put(table, merged, ttl);

    return merged;
  }

  query<K extends keyof S>(table: K) {
    return createQueryBuilder<RecordOf<S, K>>(() => this.getAll(table) as Promise<unknown[]>);
  }

  async transaction<K extends keyof S, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
  ): Promise<R> {
    if (this.closed) throw new Error(`deposit: "${this.dbName}" is closed`);

    if (!this.db) await this.connect();

    const db = this.db;

    if (!db) throw new Error(`deposit: "${this.dbName}" is closed`);

    const idbTx = db.transaction(tables.map(String), 'readwrite');
    const storeOf = <T extends K>(table: T) => idbTx.objectStore(String(table));
    const readAll = <T extends K>(table: T): Promise<RecordOf<S, T>[]> =>
      scanStore<RecordOf<S, T>>(storeOf(table)).then(async ({ expiredKeys, records }) => {
        for (const key of expiredKeys) {
          await idbReq(storeOf(table).delete(key));
        }

        return records;
      });

    const ctx: TransactionContext<S, K> = {
      count: (table) => ctx.getAll(table).then((records) => records.length),
      delete: (table, key) => idbReq(storeOf(table).delete(key as IDBValidKey)),
      deleteAll: (table) => idbReq<undefined>(storeOf(table).clear()).then(() => undefined),
      deleteWhere: async (table, predicate) => {
        return deleteWhereInStore<RecordOf<S, typeof table>>(storeOf(table), predicate);
      },
      forEach: async (table, fn) => {
        const all = await ctx.getAll(table);

        for (const record of all) {
          await fn(record);
        }
      },
      get: (table, key) =>
        idbReq<StoredRecord<RecordOf<S, typeof table>> | undefined>(storeOf(table).get(key as IDBValidKey)).then(
          (raw) => {
            if (raw == null) return undefined;

            const value = unwrapStored(raw);

            if (value === undefined) {
              return idbReq(storeOf(table).delete(key as IDBValidKey)).then(() => undefined);
            }

            return value;
          },
        ),
      getAll: (table) => readAll(table),
      getOrPut: async (table, key, fallback, ttlMs) => {
        const existing = await ctx.get(table, key);

        if (existing) return existing;

        const value = typeof fallback === 'function' ? (fallback as () => RecordOf<S, typeof table>)() : fallback;

        ensureRecordKey(this.schema, table, key, value, 'getOrPut');

        await ctx.put(table, value, ttlMs);

        return value;
      },
      has: (table, key) => ctx.get(table, key).then((value) => value !== undefined),
      put: (table, value, ttlMs) => {
        const key = resolveRecordKey(this.schema, table, value) as IDBValidKey;

        return idbReq(storeOf(table).put(wrapStored(value, ttlMs), key)).then(() => undefined);
      },
      putAll: (table, values, ttlMs) =>
        Promise.all(
          values.map((value) => {
            const key = resolveRecordKey(this.schema, table, value) as IDBValidKey;

            return idbReq(storeOf(table).put(wrapStored(value, ttlMs), key));
          }),
        ).then(() => undefined),
      query: (table) => createQueryBuilder<RecordOf<S, K>>(() => ctx.getAll(table) as Promise<unknown[]>),
      update: async (table, key, changes, ttlMs) => {
        const current = await ctx.get(table, key);

        if (!current) return undefined;

        const merged = { ...current, ...changes } as RecordOf<S, typeof table>;

        ensureRecordKey(this.schema, table, key, merged, 'update');

        await ctx.put(table, merged, ttlMs);

        return merged;
      },
    };

    const result = await runIdbTx(idbTx, this.dbName, () => fn(ctx));

    for (const table of new Set(tables)) this.broadcast(table);

    return result;
  }

  private broadcast<K extends keyof S>(table: K): void {
    this.observers.notify(table);

    this.channel?.postMessage({ table: String(table) });
  }

  private createObjectStores(db: IDBDatabase): void {
    for (const name of Object.keys(this.schema)) {
      if (!db.objectStoreNames.contains(name)) {
        db.createObjectStore(name);
      }
    }
  }

  private async withStore<T>(
    table: keyof S,
    mode: 'readonly' | 'readwrite',
    fn: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    if (this.closed) throw new Error(`deposit: "${this.dbName}" is closed`);

    if (!this.db) await this.connect();

    const db = this.db;

    if (!db) throw new Error(`deposit: "${this.dbName}" is closed`);

    const name = String(table);
    const tx = db.transaction(name, mode);
    const store = tx.objectStore(name);

    return runIdbTx(tx, `${this.dbName}/${name}`, () => fn(store));
  }
}

/* -------------------- Factory -------------------- */

export function createIndexedDB<S extends AnySchema>(options: {
  dbName: string;
  migrate?: MigrationFn;
  schema: S;
  schemaVersion: number;
}): IndexedDBHandle<S> {
  return new IndexedDBAdapter(options);
}
