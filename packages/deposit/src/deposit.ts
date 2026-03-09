/** biome-ignore-all lint/suspicious/noExplicitAny: - */

/* ============================================
   deposit - Lightweight client-side data storage
   ============================================ */

import { sort, type Predicate, search } from '@vielzeug/toolkit';

/* -------------------- Core Types -------------------- */

export type Logger = {
  error(...args: any[]): void;
  warn(...args: any[]): void;
};

type TableDef<T, K extends keyof T = keyof T> = {
  key: K;
  record: T;
  indexes?: K[];
};

export type Schema<S = Record<string, Record<string, unknown>>> = {
  [K in keyof S]: TableDef<S[K], keyof S[K]>;
};

export type MigrationFn = (
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBTransaction,
) => void | Promise<void>;

type KeyType<S extends Schema, K extends keyof S> = S[K]['record'][S[K]['key']];
type RecordType<S extends Schema, K extends keyof S> = S[K]['record'];

export type LocalStorageConfig<S extends Schema> = {
  type: 'localStorage';
  dbName: string;
  schema: S;
  logger?: Logger;
};

export type IndexedDBConfig<S extends Schema> = {
  type: 'indexedDB';
  dbName: string;
  version?: number;
  schema: S;
  migrationFn?: MigrationFn;
  logger?: Logger;
};

export type AdapterConfig<S extends Schema> = LocalStorageConfig<S> | IndexedDBConfig<S>;

/* -------------------- Schema Factory -------------------- */

/**
 * Helper to create a type-safe schema definition with clean syntax
 * @example
 * ```ts
 * const schema = defineSchema<{ users: User; posts: Post }>({
 *   users: { key: 'id', indexes: ['name', 'email'] },
 *   posts: { key: 'id' }
 * });
 * ```
 */
export function defineSchema<S extends Record<string, Record<string, unknown>>>(
  schema: { [K in keyof S]: { key: keyof S[K]; indexes?: (keyof S[K])[] } },
): Schema<S> {
  return schema as unknown as Schema<S>;
}

/* -------------------- Helper Functions -------------------- */

function wrapWithExpiry<T extends Record<string, unknown>>(value: T, ttl?: number): T & { __deposit_ttl__?: number } {
  if (!ttl) return value;
  return { ...value, __deposit_ttl__: Date.now() + ttl };
}

function isExpired(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown> & { __deposit_ttl__?: number };
  return obj.__deposit_ttl__ !== undefined && Date.now() >= obj.__deposit_ttl__;
}

function stripExpiry<T extends object>(value: T): T {
  if (!('__deposit_ttl__' in value)) return value;
  const { __deposit_ttl__: _, ...rest } = value as any;
  return rest as T;
}

/* -------------------- Adapter Interface + BaseAdapter -------------------- */

export interface Adapter<S extends Schema> {
  get<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: RecordType<S, K>,
  ): Promise<RecordType<S, K> | undefined>;
  getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]>;
  put<K extends keyof S>(table: K, value: RecordType<S, K>, ttl?: number): Promise<void>;
  delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void>;
  clear<K extends keyof S>(table: K): Promise<void>;
  count<K extends keyof S>(table: K): Promise<number>;
  bulkPut<K extends keyof S>(table: K, values: RecordType<S, K>[], ttl?: number): Promise<void>;
  bulkDelete<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void>;
  query<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>>;
}

export function query<S extends Schema, K extends keyof S>(
  adapter: Adapter<S>,
  table: K,
): QueryBuilder<RecordType<S, K>> {
  return new QueryBuilder<RecordType<S, K>>(adapter, String(table));
}

/* -------------------- createDeposit Factory -------------------- */

export function createDeposit<S extends Schema>(config: AdapterConfig<S>): Adapter<S> {
  if (config.type === 'localStorage') {
    return new LocalStorageAdapter(config.dbName, config.schema, config.logger);
  }
  return new IndexedDBAdapter(config.dbName, config.version ?? 1, config.schema, config.migrationFn, config.logger);
}

/* -------------------- QueryBuilder -------------------- */

export class QueryBuilder<T extends Record<string, unknown>> {
  private readonly operations: ReadonlyArray<(data: any[]) => any[]>;
  private readonly adapter: { getAll(table: string): Promise<unknown[]> };
  private readonly table: string;

  constructor(
    adapter: { getAll(table: string): Promise<unknown[]> },
    table: string,
    operations: ReadonlyArray<(data: any[]) => any[]> = [],
  ) {
    this.adapter = adapter;
    this.table = table;
    this.operations = operations;
  }

  private clone(op: (data: T[]) => T[]): QueryBuilder<T> {
    return new QueryBuilder<T>(this.adapter, this.table, [...this.operations, op]);
  }

  equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T> {
    return this.clone((data) => data.filter((r) => r[field] === value));
  }

  between<K extends keyof T>(field: K, lower: number | string, upper: number | string): QueryBuilder<T> {
    return this.clone((data) =>
      data.filter((r) => {
        const val = r[field] as number | string;
        return val >= lower && val <= upper;
      }),
    );
  }

  startsWith<K extends keyof T>(field: K, prefix: string, ignoreCase = false): QueryBuilder<T> {
    const lowerPrefix = ignoreCase ? prefix.toLowerCase() : prefix;
    return this.clone((data) =>
      data.filter((r) => {
        const value = r[field];
        if (typeof value !== 'string') return false;
        const str = ignoreCase ? value.toLowerCase() : value;
        return str.startsWith(lowerPrefix);
      }),
    );
  }

  filter(fn: Predicate<T>): QueryBuilder<T> {
    return this.clone((data) => data.filter(fn));
  }

  orderBy<K extends keyof T>(field: K, direction: 'asc' | 'desc' = 'asc'): QueryBuilder<T> {
    return this.clone(
      (data) => sort(data, { [field]: direction } as Partial<Record<keyof T, 'asc' | 'desc'>>) as T[],
    );
  }

  limit(n: number): QueryBuilder<T> {
    return this.clone((data) => data.slice(0, n));
  }

  offset(n: number): QueryBuilder<T> {
    return this.clone((data) => data.slice(n));
  }

  page(pageNumber: number, pageSize: number): QueryBuilder<T> {
    const start = (pageNumber - 1) * pageSize;
    return this.clone((data) => data.slice(start, start + pageSize));
  }

  reverse(): QueryBuilder<T> {
    return this.clone((data) => [...data].reverse());
  }

  map<U extends Record<string, unknown>>(callback: (record: T) => U): QueryBuilder<U> {
    return new QueryBuilder<U>(this.adapter, this.table, [...this.operations, (data: T[]) => data.map(callback)]);
  }

  search(query: string, tone?: number): QueryBuilder<T> {
    return this.clone((data) => search(data, query, tone) as T[]);
  }

  async count(): Promise<number> {
    return (await this.toArray()).length;
  }

  async first(): Promise<T | undefined> {
    return (await this.toArray())[0];
  }

  async last(): Promise<T | undefined> {
    const arr = await this.toArray();
    return arr[arr.length - 1];
  }

  async toArray(): Promise<T[]> {
    let data: any[] = (await this.adapter.getAll(this.table)) as any[];
    for (const op of this.operations) data = op(data);
    return data as T[];
  }
}

/* -------------------- LocalStorageAdapter -------------------- */

export class LocalStorageAdapter<S extends Schema> implements Adapter<S> {
  private readonly dbName: string;
  private readonly schema: S;
  private readonly logger: Logger;

  query<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>> {
    return query(this, table);
  }

  constructor(dbName: string, schema: S, logger?: Logger) {
    this.dbName = dbName;
    this.schema = schema;
    this.logger = logger ?? console;
  }

  async get<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: RecordType<S, K>,
  ): Promise<RecordType<S, K> | undefined> {
    const storageKey = this.getStorageKey(table, String(key));
    const item = localStorage.getItem(storageKey);
    if (!item) return defaultValue;

    try {
      const parsed = JSON.parse(item);

      if (!parsed || typeof parsed !== 'object') {
        localStorage.removeItem(storageKey);
        return defaultValue;
      }

      if (isExpired(parsed)) {
        localStorage.removeItem(storageKey);
        return defaultValue;
      }
      return stripExpiry(parsed) as RecordType<S, K>;
    } catch (err) {
      this.logger.warn(`Removing corrupted entry for key: ${String(key)}`, err);
      localStorage.removeItem(storageKey);
      return defaultValue;
    }
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]> {
    const prefix = this.getStorageKey(table);
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
    const records: RecordType<S, K>[] = [];

    for (const storageKey of keys) {
      const item = localStorage.getItem(storageKey);
      if (!item) continue;

      try {
        const parsed = JSON.parse(item);

        if (!parsed || typeof parsed !== 'object') {
          localStorage.removeItem(storageKey);
          continue;
        }

        if (isExpired(parsed)) {
          localStorage.removeItem(storageKey);
          continue;
        }

        records.push(stripExpiry(parsed) as RecordType<S, K>);
      } catch (err) {
        this.logger.warn(`Removing corrupted entry: ${storageKey}`, err);
        localStorage.removeItem(storageKey);
      }
    }

    return records;
  }

  async put<K extends keyof S>(table: K, value: RecordType<S, K>, ttl?: number): Promise<void> {
    const key = this.getRecordKey(value, table);
    localStorage.setItem(this.getStorageKey(table, String(key)), JSON.stringify(wrapWithExpiry(value, ttl)));
  }

  async delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void> {
    localStorage.removeItem(this.getStorageKey(table, String(key)));
  }

  async clear<K extends keyof S>(table: K): Promise<void> {
    const prefix = this.getStorageKey(table);
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => {
        localStorage.removeItem(k);
      });
  }

  async count<K extends keyof S>(table: K): Promise<number> {
    return (await this.getAll(table)).length;
  }

  async bulkPut<K extends keyof S>(table: K, values: RecordType<S, K>[], ttl?: number): Promise<void> {
    await Promise.all(values.map((v) => this.put(table, v, ttl)));
  }

  async bulkDelete<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void> {
    await Promise.all(keys.map((key) => this.delete(table, key)));
  }

  private getRecordKey<K extends keyof S>(value: Record<string, unknown>, table: K): string | number {
    const keyField = String((this.schema[table] as TableDef<any>).key);
    const keyValue = value[keyField];

    if (keyValue === undefined || keyValue === null) {
      throw new Error(`Missing required key field "${keyField}" in record for table "${String(table)}"`);
    }

    return keyValue as string | number;
  }

  private getStorageKey<K extends keyof S>(table: K, key?: string | number): string {
    const prefix = `${encodeURIComponent(this.dbName)}:${encodeURIComponent(String(table))}:`;
    return key === undefined || key === '' ? prefix : prefix + encodeURIComponent(String(key));
  }
}

/* -------------------- IndexedDBAdapter -------------------- */

export class IndexedDBAdapter<S extends Schema> implements Adapter<S> {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly schema: S;
  private readonly version: number;
  private readonly migrationFn?: MigrationFn;
  private readonly logger: Logger;

  query<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>> {
    return query(this, table);
  }

  constructor(dbName: string, version: number, schema: S, migrationFn?: MigrationFn, logger?: Logger) {
    this.dbName = dbName;
    this.version = version;
    this.schema = schema;
    this.migrationFn = migrationFn;
    this.logger = logger ?? console;
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const tx = request.transaction!;
        this.createObjectStores(db);

        if (this.migrationFn) {
          const handleError = (err: unknown) => {
            try {
              tx.abort();
            } catch {
              /* ignore */
            }
            reject(new Error('Migration failed', { cause: err }));
          };
          try {
            const result = this.migrationFn(db, event.oldVersion, (event as any).newVersion ?? null, tx);
            Promise.resolve(result).catch(handleError);
          } catch (err) {
            handleError(err);
          }
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    });
  }

  async get<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: RecordType<S, K>,
  ): Promise<RecordType<S, K> | undefined> {
    return await this.withTransaction(table, 'readonly', async (store) => {
      const result = (await this.requestToPromise(store.get(key as IDBValidKey))) as any;
      if (!result || isExpired(result)) return defaultValue;
      return stripExpiry(result) as RecordType<S, K>;
    });
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]> {
    return await this.withTransaction(table, 'readonly', async (store) => {
      const results = await this.requestToPromise(store.getAll());
      return results
        .filter((rec) => rec && typeof rec === 'object' && !isExpired(rec))
        .map((rec) => stripExpiry(rec as object)) as RecordType<S, K>[];
    });
  }

  async put<K extends keyof S>(table: K, value: RecordType<S, K>, ttl?: number): Promise<void> {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await this.requestToPromise(store.put(wrapWithExpiry(value, ttl)));
    });
  }

  async delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void> {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await this.requestToPromise(store.delete(key as IDBValidKey));
    });
  }

  async clear<K extends keyof S>(table: K): Promise<void> {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await this.requestToPromise(store.clear());
    });
  }

  async count<K extends keyof S>(table: K): Promise<number> {
    return await this.withTransaction(table, 'readonly', async (store) => {
      return this.requestToPromise(store.count());
    });
  }

  async bulkPut<K extends keyof S>(table: K, values: RecordType<S, K>[], ttl?: number): Promise<void> {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await Promise.all(values.map((value) => this.requestToPromise(store.put(wrapWithExpiry(value, ttl)))));
    });
  }

  async bulkDelete<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void> {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await Promise.all(keys.map((key) => this.requestToPromise(store.delete(key as IDBValidKey))));
    });
  }

  async transaction<K extends keyof S>(
    tables: K[],
    fn: (stores: { [P in K]: RecordType<S, P>[] }) => Promise<void>,
    ttl?: number,
  ): Promise<void> {
    if (!this.db) await this.connect();

    return new Promise<void>((resolve, reject) => {
      const tableNames = tables.map(String);
      const tx = this.db!.transaction(tableNames, 'readwrite');
      const tablesStr = tableNames.join(', ');
      let callbackError: Error | undefined;

      (async () => {
        const storeMap = {} as { [P in K]: RecordType<S, P>[] };
        await Promise.all(
          tables.map(async (table) => {
            const store = tx.objectStore(String(table));
            const results = await this.requestToPromise(store.getAll());
            (storeMap as any)[table] = results
              .filter((rec) => rec && typeof rec === 'object' && !isExpired(rec))
              .map((rec) => stripExpiry(rec as object));
          }),
        );
        await fn(storeMap);
        await Promise.all(
          tables.map(async (table) => {
            const store = tx.objectStore(String(table));
            await this.requestToPromise(store.clear());
            await Promise.all(
              (storeMap[table] as RecordType<S, K>[]).map((value) =>
                this.requestToPromise(store.put(wrapWithExpiry(value, ttl))),
              ),
            );
          }),
        );
      })().catch((err) => {
        callbackError = err;
        try {
          tx.abort();
        } catch {
          /* ignore */
        }
      });

      tx.oncomplete = () =>
        callbackError ? reject(new Error(`Transaction failed for ${tablesStr}`, { cause: callbackError })) : resolve();
      tx.onerror = () => reject(new Error(`Transaction error for ${tablesStr}`, { cause: tx.error }));
      tx.onabort = () => {
        const error = callbackError || tx.error || new Error('Transaction aborted');
        reject(new Error(`Transaction aborted for ${tablesStr}`, { cause: error }));
      };
    });
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Schema creation requires validation logic
  private createObjectStores(db: IDBDatabase): void {
    for (const [name, def] of Object.entries(this.schema)) {
      if (db.objectStoreNames.contains(name)) continue;

      const recordDef = def as TableDef<any>;
      const keyPath = recordDef.key as string;
      const store = db.createObjectStore(name, { keyPath });

      const indexes = recordDef.indexes;
      if (indexes) {
        const createdIndexes = new Set<string>();

        for (const index of indexes) {
          const indexName = index as string;

          if (createdIndexes.has(indexName)) {
            this.logger.warn(`Duplicate index "${indexName}" in table "${name}" schema - skipping`);
            continue;
          }

          if (indexName === keyPath) {
            this.logger.warn(`Skipping index on key path "${indexName}" in table "${name}" - redundant`);
            continue;
          }

          try {
            store.createIndex(indexName, indexName);
            createdIndexes.add(indexName);
          } catch (err) {
            this.logger.error(`Failed to create index "${indexName}" in table "${name}"`, err);
          }
        }
      }
    }
  }

  private async withTransaction<T>(
    table: keyof S,
    mode: 'readonly' | 'readwrite',
    fn: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    if (!this.db) await this.connect();

    return new Promise<T>((resolve, reject) => {
      const name = String(table);
      const tx = this.db!.transaction(name, mode);
      const store = tx.objectStore(name);

      let result: T | undefined;
      let callbackError: Error | undefined;

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
          ? reject(new Error(`Transaction callback failed for ${name}`, { cause: callbackError }))
          : resolve(result as T);
      tx.onerror = () => reject(new Error(`Transaction error for ${name}`, { cause: tx.error }));
      tx.onabort = () => {
        const error = callbackError || tx.error || new Error('Transaction aborted');
        reject(new Error(`Transaction aborted for ${name}`, { cause: error }));
      };
    });
  }

  private requestToPromise<R>(req: IDBRequest<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    });
  }
}
