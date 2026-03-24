import type {
  IndexedDBHandle,
  IndexedDBOptions,
  KeyType,
  Logger,
  MigrationFn,
  RecordType,
  Schema,
  TransactionContext,
} from '../types';

import { QueryBuilder } from '../query';
import { type Envelope, isEnvelope, readEnvelope, unwrap, wrap } from '../ttl';

/* -------------------- IndexedDBAdapter -------------------- */

class IndexedDBAdapter<S extends Schema<any>> implements IndexedDBHandle<S> {
  private db: IDBDatabase | null = null;
  private connectPromise: Promise<void> | null = null;
  private closed = false;
  private readonly dbName: string;
  private readonly schema: S;
  private readonly version: number;
  private readonly migrationFn?: MigrationFn;
  private readonly logger: Logger;

  constructor(dbName: string, version: number, schema: S, migrationFn?: MigrationFn, logger?: Logger) {
    this.dbName = dbName;
    this.version = version;
    this.schema = schema;
    this.migrationFn = migrationFn;
    this.logger = logger ?? console;
  }

  from<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>> {
    return new QueryBuilder<RecordType<S, K>>(this, String(table));
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
              this.migrationFn(db, event.oldVersion, (event as IDBVersionChangeEvent).newVersion ?? null, tx);
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

          // After migration, ensure all stores/indexes declared in the schema exist.
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
      readEnvelope<RecordType<S, K>>(await this.idbRequest<unknown>(store.get(key as IDBValidKey))),
    );
  }

  async getOr<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    defaultValue: RecordType<S, K>,
  ): Promise<RecordType<S, K>> {
    return (await this.get(table, key)) ?? defaultValue;
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]> {
    return this.withStore(table, 'readonly', async (store) => {
      const results = await this.idbRequest<Envelope<RecordType<S, K>>[]>(store.getAll());
      const records: RecordType<S, K>[] = [];
      const expiredKeys: IDBValidKey[] = [];
      const keyField = String((this.schema[table] as { key: string }).key);

      for (const env of results) {
        if (!isEnvelope(env)) continue;

        const value = unwrap(env);

        if (value !== undefined) {
          records.push(value);
        } else {
          expiredKeys.push((env.v as Record<string, unknown>)[keyField] as IDBValidKey);
        }
      }

      if (expiredKeys.length > 0) {
        void this.withStore(table, 'readwrite', (s) =>
          Promise.all(expiredKeys.map((k) => this.idbRequest(s.delete(k)))).then(() => undefined),
        ).catch((err) => {
          this.logger.warn('deposit: failed to evict expired records', err);
        });
      }

      return records;
    });
  }

  async getMany<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<RecordType<S, K>[]> {
    return this.withStore(table, 'readonly', async (store) => {
      const raws = await Promise.all(keys.map((k) => this.idbRequest<unknown>(store.get(k as IDBValidKey))));

      return raws
        .map((raw) => readEnvelope<RecordType<S, K>>(raw))
        .filter((v): v is RecordType<S, K> => v !== undefined);
    });
  }

  async put<K extends keyof S>(table: K, value: RecordType<S, K>, ttl?: number): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => this.idbRequest(store.put(wrap(value, ttl))));
  }

  async putMany<K extends keyof S>(table: K, values: RecordType<S, K>[], ttl?: number): Promise<void> {
    await this.withStore(table, 'readwrite', async (store) => {
      await Promise.all(values.map((v) => this.idbRequest(store.put(wrap(v, ttl)))));
    });
  }

  async delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => this.idbRequest(store.delete(key as IDBValidKey)));
  }

  async deleteMany<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void> {
    await this.withStore(table, 'readwrite', async (store) => {
      await Promise.all(keys.map((k) => this.idbRequest(store.delete(k as IDBValidKey))));
    });
  }

  async patch<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    partial: Partial<RecordType<S, K>>,
    ttl?: number,
  ): Promise<RecordType<S, K> | undefined> {
    return this.withStore(table, 'readwrite', async (store) => {
      const raw = await this.idbRequest<unknown>(store.get(key as IDBValidKey));

      if (!raw || !isEnvelope(raw)) return undefined;

      const current = unwrap(raw as Envelope<RecordType<S, K>>);

      if (current === undefined) return undefined;

      const merged = { ...current, ...partial } as RecordType<S, K>;
      const env = raw as Envelope<RecordType<S, K>>;
      const newEnv: Envelope<RecordType<S, K>> =
        ttl !== undefined ? { exp: Date.now() + ttl, v: merged } : { ...env, v: merged };

      await this.idbRequest(store.put(newEnv));

      return merged;
    });
  }

  async getOrPut<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    factory: () => RecordType<S, K> | Promise<RecordType<S, K>>,
    ttl?: number,
  ): Promise<RecordType<S, K>> {
    return this.withStore(table, 'readwrite', async (store) => {
      const existing = readEnvelope<RecordType<S, K>>(await this.idbRequest<unknown>(store.get(key as IDBValidKey)));

      if (existing !== undefined) return existing;

      const value = await factory();

      await this.idbRequest(store.put(wrap(value, ttl)));

      return value;
    });
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => this.idbRequest<undefined>(store.clear()));
  }

  /**
   * Returns the native IDB record count in O(1).
   * Note: may include TTL-expired records that have not been evicted yet.
   * For a precise live count use `(await db.getAll(table)).length` or `db.from(table).count()`.
   */
  async count<K extends keyof S>(table: K): Promise<number> {
    return this.withStore(table, 'readonly', (store) => this.idbRequest<number>(store.count()));
  }

  async has<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<boolean> {
    return this.withStore(
      table,
      'readonly',
      async (store) =>
        readEnvelope<RecordType<S, K>>(await this.idbRequest<unknown>(store.get(key as IDBValidKey))) !== undefined,
    );
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
        count: (table) => this.idbRequest<number>(idbTx.objectStore(String(table)).count()),
        delete: (table, key) => this.idbRequest(idbTx.objectStore(String(table)).delete(key as IDBValidKey)),
        deleteAll: (table) =>
          this.idbRequest<undefined>(idbTx.objectStore(String(table)).clear()).then(() => undefined),
        deleteMany: (table, keys) =>
          Promise.all(keys.map((k) => this.idbRequest(idbTx.objectStore(String(table)).delete(k as IDBValidKey)))).then(
            () => undefined,
          ),
        from: (table) =>
          new QueryBuilder<RecordType<S, K>>(
            {
              getAll: (t) => {
                if (!tables.includes(t as K)) {
                  throw new Error(`deposit: table "${t}" is not part of this transaction`);
                }

                return ctx.getAll(t as K);
              },
            },
            String(table),
          ),
        get: (table, key) =>
          this.idbRequest<unknown>(idbTx.objectStore(String(table)).get(key as IDBValidKey)).then((raw) =>
            readEnvelope<RecordType<S, K>>(raw),
          ),
        getAll: (table) =>
          this.idbRequest<unknown[]>(idbTx.objectStore(String(table)).getAll()).then((raws) =>
            raws
              .map((raw) => readEnvelope<RecordType<S, K>>(raw))
              .filter((v): v is RecordType<S, K> => v !== undefined),
          ),
        getMany: (table, keys) =>
          Promise.all(
            keys.map((k) => this.idbRequest<unknown>(idbTx.objectStore(String(table)).get(k as IDBValidKey))),
          ).then((raws) =>
            raws
              .map((raw) => readEnvelope<RecordType<S, K>>(raw))
              .filter((v): v is RecordType<S, K> => v !== undefined),
          ),
        getOr: (table, key, defaultValue) => ctx.get(table, key).then((v) => v ?? defaultValue),
        has: (table, key) =>
          this.idbRequest<unknown>(idbTx.objectStore(String(table)).get(key as IDBValidKey)).then(
            (raw) => readEnvelope<RecordType<S, K>>(raw) !== undefined,
          ),
        patch: (table, key, partial, ttl) =>
          this.idbRequest<unknown>(idbTx.objectStore(String(table)).get(key as IDBValidKey)).then((raw) => {
            if (!raw || !isEnvelope(raw)) return undefined;

            const current = unwrap(raw as Envelope<RecordType<S, K>>);

            if (current === undefined) return undefined;

            const merged = { ...current, ...partial } as RecordType<S, K>;
            const env = raw as Envelope<RecordType<S, K>>;
            const newEnv: Envelope<RecordType<S, K>> =
              ttl !== undefined ? { exp: Date.now() + ttl, v: merged } : { ...env, v: merged };

            return this.idbRequest(idbTx.objectStore(String(table)).put(newEnv)).then(() => merged);
          }),
        put: (table, value, ttl) =>
          this.idbRequest(idbTx.objectStore(String(table)).put(wrap(value, ttl))).then(() => undefined),
        putMany: (table, values, ttl) =>
          Promise.all(values.map((v) => this.idbRequest(idbTx.objectStore(String(table)).put(wrap(v, ttl))))).then(
            () => undefined,
          ),
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
      const indexes = (def as { indexes?: string[] }).indexes ?? [];

      let store: IDBObjectStore;

      if (db.objectStoreNames.contains(name)) {
        // access the existing store via the upgrade transaction to add any new indexes
        store = tx.objectStore(name);
      } else {
        store = db.createObjectStore(name, { keyPath: `v.${keyPath}` });
      }

      const created = new Set<string>(store.indexNames as unknown as Iterable<string>);

      for (const index of indexes) {
        if (created.has(index)) {
          // already exists (either pre-existing or duplicate in schema declaration)
          continue;
        }

        if (index === keyPath) {
          this.logger.warn(`deposit: skipping index on key path "${index}" in table "${name}" — redundant`);
          continue;
        }

        try {
          store.createIndex(index, `v.${index}`);
          created.add(index);
        } catch (err) {
          this.logger.error(`deposit: failed to create index "${index}" in table "${name}"`, err);
        }
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

  private idbRequest<R>(req: IDBRequest<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error(`deposit: IndexedDB request on "${this.dbName}" failed`));
    });
  }
}

/* -------------------- Factory -------------------- */

export function createIndexedDB<S extends Schema<any>>(options: IndexedDBOptions<S>): IndexedDBHandle<S> {
  return new IndexedDBAdapter(options.dbName, options.version, options.schema, options.migrationFn, options.logger);
}
