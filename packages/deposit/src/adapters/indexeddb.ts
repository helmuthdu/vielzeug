import type {
  IndexedDBHandle,
  IndexedDBOptions,
  KeyType,
  MigrationFn,
  RecordType,
  Schema,
  TransactionContext,
} from '../types';

import { QueryBuilder } from '../query';
import { type Envelope, isEnvelope, readEnvelope, unwrap, wrap } from '../ttl';

/* -------------------- Module-level IDB helpers -------------------- */

function idbReq<R>(req: IDBRequest<R>): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('deposit: IndexedDB request failed'));
  });
}

function filterRecords<T>(raws: unknown[]): T[] {
  const out: T[] = [];

  for (const raw of raws) {
    if (!isEnvelope(raw)) continue;

    const v = unwrap(raw as Envelope<T>);

    if (v !== undefined) out.push(v);
  }

  return out;
}

/* -------------------- IndexedDBAdapter -------------------- */

class IndexedDBAdapter<S extends Schema<any>> implements IndexedDBHandle<S> {
  private db: IDBDatabase | null = null;
  private connectPromise: Promise<void> | null = null;
  private closed = false;
  private readonly dbName: string;
  private readonly schema: S;
  private readonly version: number;
  private readonly migrationFn?: MigrationFn;

  constructor(dbName: string, version: number, schema: S, migrationFn?: MigrationFn) {
    this.dbName = dbName;
    this.version = version;
    this.schema = schema;
    this.migrationFn = migrationFn;
  }

  from<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>> {
    return new QueryBuilder<RecordType<S, K>>(() => this.getAll(table) as Promise<unknown[]>);
  }

  close(): void {
    this.closed = true;
    this.db?.close();
    this.db = null;
    this.connectPromise = null;
  }

  private connect(): Promise<void> {
    if (!this.connectPromise) {
      this.closed = false;
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
          reject(new Error(`deposit: failed to open "${this.dbName}" (IndexedDB)`));
        };
      });
    }

    return this.connectPromise!;
  }

  async get<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<RecordType<S, K> | undefined> {
    return this.withStore(table, 'readonly', async (store) =>
      readEnvelope<RecordType<S, K>>(await idbReq<unknown>(store.get(key as IDBValidKey))),
    );
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]> {
    return this.withStore(table, 'readonly', async (store) =>
      filterRecords<RecordType<S, K>>(await idbReq<Envelope<RecordType<S, K>>[]>(store.getAll())),
    );
  }

  async put<K extends keyof S>(table: K, value: RecordType<S, K>, ttl?: number): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => idbReq(store.put(wrap(value, ttl))));
  }

  async delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => idbReq(store.delete(key as IDBValidKey)));
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => idbReq<undefined>(store.clear()));
  }

  async count<K extends keyof S>(table: K): Promise<number> {
    return (await this.getAll(table)).length;
  }

  async transaction<K extends keyof S>(
    tables: K[],
    fn: (tx: TransactionContext<S, K>) => Promise<void>,
  ): Promise<void> {
    if (!this.db) await this.connect();

    const db = this.db;

    if (!db) throw new Error(`deposit: "${this.dbName}" is closed`);

    return new Promise<void>((resolve, reject) => {
      const idbTx = db.transaction(tables.map(String), 'readwrite');
      let callbackError: unknown;

      const ctx: TransactionContext<S, K> = {
        count: (table) => ctx.getAll(table).then((all) => all.length),
        delete: (table, key) => idbReq(idbTx.objectStore(String(table)).delete(key as IDBValidKey)),
        deleteAll: (table) => idbReq<undefined>(idbTx.objectStore(String(table)).clear()).then(() => undefined),
        from: (table) => new QueryBuilder<RecordType<S, K>>(() => ctx.getAll(table) as Promise<unknown[]>),
        get: (table, key) =>
          idbReq<unknown>(idbTx.objectStore(String(table)).get(key as IDBValidKey)).then((raw) =>
            readEnvelope<RecordType<S, K>>(raw),
          ),
        getAll: (table) =>
          idbReq<unknown[]>(idbTx.objectStore(String(table)).getAll()).then(filterRecords<RecordType<S, K>>),
        put: (table, value, ttl) =>
          idbReq(idbTx.objectStore(String(table)).put(wrap(value, ttl))).then(() => undefined),
      };

      fn(ctx).catch((err) => {
        callbackError = err;

        try {
          idbTx.abort();
        } catch {
          /* ignore */
        }
      });

      idbTx.oncomplete = () =>
        callbackError
          ? reject(new Error(`deposit: transaction on "${this.dbName}" failed`, { cause: callbackError }))
          : resolve();
      idbTx.onerror = () => reject(new Error(`deposit: transaction error on "${this.dbName}"`, { cause: idbTx.error }));
      idbTx.onabort = () => {
        reject(
          new Error(`deposit: transaction on "${this.dbName}" was aborted`, {
            cause: callbackError ?? idbTx.error,
          }),
        );
      };
    });
  }

  private createObjectStores(db: IDBDatabase, tx: IDBTransaction): void {
    for (const [name, def] of Object.entries(this.schema)) {
      const keyPath = (def as { key: string }).key;

      if (db.objectStoreNames.contains(name)) {
        // Ensure existing stores are part of the upgrade transaction.
        tx.objectStore(name);
      } else {
        db.createObjectStore(name, { keyPath: `v.${keyPath}` });
      }
    }
  }

  private async withStore<T>(
    table: keyof S,
    mode: 'readonly' | 'readwrite',
    fn: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    if (!this.db) await this.connect();

    const db = this.db;

    if (!db) throw new Error(`deposit: "${this.dbName}" is closed`);

    return new Promise<T>((resolve, reject) => {
      const name = String(table);
      const tx = db.transaction(name, mode);
      const store = tx.objectStore(name);

      let result: T | undefined;
      let callbackError: unknown;

      fn(store)
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
          ? reject(new Error(`deposit: transaction on "${this.dbName}/${name}" failed`, { cause: callbackError }))
          : resolve(result as T);
      tx.onerror = () =>
        reject(new Error(`deposit: transaction error on "${this.dbName}/${name}"`, { cause: tx.error }));
      tx.onabort = () => {
        reject(
          new Error(`deposit: transaction on "${this.dbName}/${name}" was aborted`, {
            cause: callbackError ?? tx.error,
          }),
        );
      };
    });
  }
}

/* -------------------- Factory -------------------- */

export function createIndexedDB<S extends Schema<any>>(options: IndexedDBOptions<S>): IndexedDBHandle<S> {
  return new IndexedDBAdapter(options.dbName, options.version, options.schema, options.migrationFn);
}
