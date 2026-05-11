import type { AnySchema, IndexedDBHandle, KeyOf, MigrationFn, RecordOf, TransactionContext } from '../types';

import { QueryBuilder } from '../query';
import { type StoredRecord, unwrapStored, wrapStored } from '../ttl';
import { AdapterCore } from './adapter-core';

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

    work()
      .then((r) => {
        result = r;
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

async function readAllFromStore<T extends Record<string, unknown>>(store: IDBObjectStore): Promise<T[]> {
  const [raws, keys] = await Promise.all([
    idbReq<StoredRecord<T>[]>(store.getAll()),
    idbReq<IDBValidKey[]>(store.getAllKeys()),
  ]);
  const results: T[] = [];

  for (let i = 0; i < raws.length; i++) {
    const value = unwrapStored(raws[i]);

    if (value !== undefined) {
      results.push(value);
    } else {
      store.delete(keys[i]);
    }
  }

  return results;
}

/* -------------------- IndexedDBAdapter -------------------- */

class IndexedDBAdapter<S extends AnySchema> extends AdapterCore<S> implements IndexedDBHandle<S> {
  private db: IDBDatabase | null = null;
  private connectPromise: Promise<void> | null = null;
  private closed = false;
  private readonly channel?: BroadcastChannel;
  private readonly dbName: string;
  private readonly migrate?: MigrationFn;
  protected readonly schema: S;
  private readonly schemaVersion: number;

  constructor(options: { dbName: string; migrate?: MigrationFn; schema: S; schemaVersion: number }) {
    super();
    this.dbName = options.dbName;
    this.migrate = options.migrate;
    this.schema = options.schema;
    this.schemaVersion = options.schemaVersion;

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(`deposit:${this.dbName}`);
      this.channel.onmessage = (event: MessageEvent<{ table: string }>) => {
        this.notify(event.data.table as keyof S);
      };
    }
  }

  close(): void {
    this.closed = true;
    this.db?.close();
    this.db = null;
    this.connectPromise = null;
    this.channel?.close();
  }

  private connect(): Promise<void> {
    if (!this.connectPromise) {
      this.connectPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.schemaVersion);

        request.onupgradeneeded = (event) => {
          const db = request.result;
          const tx = request.transaction!;

          // Run user migration first — it may drop/recreate stores before deposit ensures schema.
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

          // After migration, ensure all stores declared in the schema exist.
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

    return this.connectPromise!;
  }

  async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
    return this.withStore(table, 'readwrite', async (store) => {
      const raw = await idbReq<StoredRecord<RecordOf<S, K>> | undefined>(store.get(key as IDBValidKey));

      if (raw == null) return undefined;

      const value = unwrapStored(raw);

      if (value === undefined) {
        await idbReq(store.delete(key as IDBValidKey));
      }

      return value;
    });
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
    return this.withStore(table, 'readwrite', (store) => readAllFromStore<RecordOf<S, K>>(store));
  }

  async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void> {
    const key = this.resolveRecordKey(table, value) as IDBValidKey;

    await this.withStore(table, 'readwrite', (store) => idbReq(store.put(wrapStored(value, ttl), key)));
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

  async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: number): Promise<void> {
    await this.withStore(table, 'readwrite', async (store) => {
      await Promise.all(
        values.map((value) => {
          const key = this.resolveRecordKey(table, value) as IDBValidKey;

          return idbReq(store.put(wrapStored(value, ttl), key));
        }),
      );
    });
    this.broadcast(table);
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
      readAllFromStore<RecordOf<S, T>>(storeOf(table));

    const ctx: TransactionContext<S, K> = {
      count: (table) => ctx.getAll(table).then((all) => all.length),
      delete: (table, key) => idbReq(storeOf(table).delete(key as IDBValidKey)),
      deleteAll: (table) => idbReq<undefined>(storeOf(table).clear()).then(() => undefined),
      deleteWhere: async (table, predicate) => {
        const all = await ctx.getAll(table);
        let deleted = 0;

        for (const row of all) {
          if (!predicate(row)) continue;

          await ctx.delete(table, this.resolveRecordKey(table, row));
          deleted += 1;
        }

        return deleted;
      },
      forEach: async (table, fn) => {
        const all = await ctx.getAll(table);

        for (let i = 0; i < all.length; i += 1) {
          await fn(all[i], i);
        }
      },
      get: (table, key) =>
        idbReq<StoredRecord<RecordOf<S, typeof table>> | undefined>(storeOf(table).get(key as IDBValidKey)).then(
          (raw) => {
            if (raw == null) return undefined;

            const value = unwrapStored(raw);

            if (value === undefined) storeOf(table).delete(key as IDBValidKey);

            return value;
          },
        ),
      getAll: (table) => readAll(table),
      getOrPut: async (table, key, fallback, ttl) => {
        const existing = await ctx.get(table, key);

        if (existing) return existing;

        const value = typeof fallback === 'function' ? (fallback as () => RecordOf<S, typeof table>)() : fallback;

        await ctx.put(table, value, ttl);

        return value;
      },
      has: (table, key) => ctx.get(table, key).then((v) => v !== undefined),
      put: (table, value, ttl) => {
        const key = this.resolveRecordKey(table, value) as IDBValidKey;

        return idbReq(storeOf(table).put(wrapStored(value, ttl), key)).then(() => undefined);
      },
      putAll: (table, values, ttl) =>
        Promise.all(
          values.map((value) => {
            const key = this.resolveRecordKey(table, value) as IDBValidKey;

            return idbReq(storeOf(table).put(wrapStored(value, ttl), key));
          }),
        ).then(() => undefined),
      query: (table) => new QueryBuilder<RecordOf<S, K>>(() => ctx.getAll(table) as Promise<unknown[]>),
      update: async (table, key, changes, ttl) => {
        const current = await ctx.get(table, key);

        if (!current) return undefined;

        const merged = { ...current, ...changes } as RecordOf<S, typeof table>;

        await ctx.put(table, merged, ttl);

        return merged;
      },
    };

    const result = await runIdbTx(idbTx, this.dbName, () => fn(ctx));

    for (const table of tables) this.broadcast(table);

    return result;
  }

  private broadcast<K extends keyof S>(table: K): void {
    this.notify(table);
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
