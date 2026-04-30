import type {
  AnySchema,
  IndexedDBHandle,
  KeyOf,
  MigrationFn,
  RecordOf,
  TransactionContext,
} from '../types';

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

function filterRecords<T extends Record<string, unknown>>(raws: unknown[]): T[] {
  return (raws as StoredRecord<T>[]).map(unwrapStored).filter((v): v is T => v !== undefined);
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

/* -------------------- IndexedDBAdapter -------------------- */

class IndexedDBAdapter<S extends AnySchema> extends AdapterCore<S> implements IndexedDBHandle<S> {
  private db: IDBDatabase | null = null;
  private connectPromise: Promise<void> | null = null;
  private closed = false;
  private readonly dbName: string;
  private readonly schema: S;
  private readonly version: number;
  private readonly migrationFn?: MigrationFn;

  constructor(options: { dbName: string; migrationFn?: MigrationFn; schema: S; version: number }) {
    super();
    this.dbName = options.dbName;
    this.version = options.version;
    this.schema = options.schema;
    this.migrationFn = options.migrationFn;
  }

  close(): void {
    this.closed = true;
    this.db?.close();
    this.db = null;
    this.connectPromise = null;
  }

  private connect(): Promise<void> {
    if (!this.connectPromise) {
      this.connectPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);

        request.onupgradeneeded = (event) => {
          const db = request.result;
          const tx = request.transaction!;

          // Run user migration first — it may drop/recreate stores before deposit ensures schema.
          if (this.migrationFn) {
            try {
              this.migrationFn({
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
          this.createObjectStores(db, tx);
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
    return this.withStore(table, 'readonly', async (store) => {
      const raw = await idbReq<StoredRecord<RecordOf<S, K>> | undefined>(store.get(key as IDBValidKey));
      return raw != null ? unwrapStored(raw) : undefined;
    });
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
    return this.withStore(table, 'readonly', async (store) =>
      filterRecords<RecordOf<S, K>>(await idbReq<unknown[]>(store.getAll())),
    );
  }

  async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => idbReq(store.put(wrapStored(value, ttl))));
  }

  async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => idbReq(store.delete(key as IDBValidKey)));
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => idbReq<undefined>(store.clear()));
  }

  async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: number): Promise<void> {
    await this.withStore(table, 'readwrite', async (store) => {
      const requests = values.map((value) => idbReq(store.put(wrapStored(value, ttl))));
      await Promise.all(requests);
    });
  }

  async transaction<K extends keyof S>(
    tables: K[],
    fn: (tx: TransactionContext<S, K>) => Promise<void>,
  ): Promise<void> {
    if (this.closed) throw new Error(`deposit: "${this.dbName}" is closed`);
    if (!this.db) await this.connect();

    const db = this.db;

    if (!db) throw new Error(`deposit: "${this.dbName}" is closed`);

    const idbTx = db.transaction(tables.map(String), 'readwrite');
    const storeOf = <T extends K>(table: T) => idbTx.objectStore(String(table));
    const read = <T extends K>(table: T, key: KeyOf<S, T>) =>
      idbReq<StoredRecord<RecordOf<S, T>> | undefined>(storeOf(table).get(key as IDBValidKey)).then((raw) =>
        raw != null ? unwrapStored(raw) : undefined,
      );
    const readAll = <T extends K>(table: T) =>
      idbReq<unknown[]>(storeOf(table).getAll()).then(filterRecords<RecordOf<S, T>>);

    const ctx: TransactionContext<S, K> = {
      count: (table) => ctx.getAll(table).then((all) => all.length),
      delete: (table, key) => idbReq(storeOf(table).delete(key as IDBValidKey)),
      deleteAll: (table) => idbReq<undefined>(storeOf(table).clear()).then(() => undefined),
      from: (table) => new QueryBuilder<RecordOf<S, K>>(() => ctx.getAll(table) as Promise<unknown[]>),
      get: (table, key) => read(table, key),
      getAll: (table) => readAll(table),
      has: (table, key) => ctx.get(table, key).then((v) => v !== undefined),
      put: (table, value, ttl) => idbReq(storeOf(table).put(wrapStored(value, ttl))).then(() => undefined),
      putAll: (table, values, ttl) => {
        for (const value of values) storeOf(table).put(wrapStored(value, ttl));
        return Promise.resolve();
      },
    };

    await runIdbTx(idbTx, this.dbName, async () => {
      await fn(ctx);
    });
  }

  private createObjectStores(db: IDBDatabase, tx: IDBTransaction): void {
    for (const [name, def] of Object.entries(this.schema)) {
      const keyPath = (def as { key: string }).key;

      if (db.objectStoreNames.contains(name)) {
        // Ensure existing stores are part of the upgrade transaction.
        tx.objectStore(name);
      } else {
        db.createObjectStore(name, { keyPath });
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
  migrationFn?: MigrationFn;
  schema: S;
  version: number;
}): IndexedDBHandle<S> {
  return new IndexedDBAdapter(options);
}
