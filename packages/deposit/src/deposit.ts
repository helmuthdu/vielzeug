/** biome-ignore-all lint/suspicious/noExplicitAny: - */

/* ============================================
   deposit - Lightweight client-side data storage
   ============================================ */

import { arrange, group, max, min, type Predicate, search } from '@vielzeug/toolkit';

/* -------------------- Core Types -------------------- */

export type Logger = {
  error(...args: any[]): void;
  warn(...args: any[]): void;
};

export type DepositDataRecord<T, K extends keyof T = keyof T> = {
  key: K;
  record: T;
  indexes?: K[];
};

export type DepositDataSchema<S = Record<string, Record<string, unknown>>> = {
  [K in keyof S]: DepositDataRecord<S[K], keyof S[K]>;
};

export type DepositMigrationFn<S extends DepositDataSchema> = (
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBTransaction,
  schema: S,
) => void | Promise<void>;

type KeyType<S extends DepositDataSchema, K extends keyof S> = S[K]['record'][S[K]['key']];
type RecordType<S extends DepositDataSchema, K extends keyof S> = S[K]['record'];

type AdapterConfig<S extends DepositDataSchema> = {
  type: 'localStorage' | 'indexedDB';
  dbName: string;
  version?: number;
  schema: S;
  migrationFn?: DepositMigrationFn<S>;
  logger?: Logger;
};

/* -------------------- Schema Validation -------------------- */

/**
 * Helper to create a type-safe schema definition with clean syntax
 * @example
 * ```ts
 * const schema = defineSchema<{ users: User; posts: Post }>()({
 *   users: { key: 'id', indexes: ['name', 'email'] },
 *   posts: { key: 'id' }
 * });
 * ```
 */
export function defineSchema<S extends Record<string, Record<string, unknown>>>() {
  return <Schema extends { [K in keyof S]: { key: keyof S[K]; indexes?: Array<keyof S[K]> } }>(
    schema: Schema,
  ): DepositDataSchema<S> => schema as unknown as DepositDataSchema<S>;
}

function validateDepositSchema<S extends DepositDataSchema>(schema: S): void {
  for (const [tableName, def] of Object.entries(schema)) {
    const recordDef = def as DepositDataRecord<any>;
    if (!recordDef || recordDef.key === undefined) {
      throw new Error(
        `Invalid schema: table "${tableName}" missing required "key" field. ` +
          'Schema entries must have shape: { key: K; indexes?: K[] }',
      );
    }
  }
}

/* -------------------- Helper Functions -------------------- */

function wrapWithExpiry<T extends Record<string, unknown>>(value: T, ttl?: number): T & { expiresAt?: number } {
  if (!ttl) return value;
  return { ...value, expiresAt: Date.now() + ttl };
}

function isExpired(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown> & { expiresAt?: number };
  return obj.expiresAt !== undefined && Date.now() >= obj.expiresAt;
}

function stripExpiry<T extends object>(value: T): T {
  if (!('expiresAt' in value)) return value;
  const { expiresAt: _, ...rest } = value as any;
  return rest as T;
}

type PatchOperation<T, K = any> =
  | { type: 'put'; value: T; ttl?: number }
  | { type: 'delete'; key: K }
  | { type: 'clear' };

/* -------------------- DepositBaseAdapter -------------------- */

export abstract class DepositBaseAdapter<S extends DepositDataSchema> {
  abstract get<K extends keyof S, T extends RecordType<S, K>>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: T,
  ): Promise<T | undefined>;
  abstract getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]>;
  abstract put<K extends keyof S>(table: K, value: RecordType<S, K>, ttl?: number): Promise<void>;
  abstract delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void>;
  abstract clear<K extends keyof S>(table: K): Promise<void>;
  abstract count<K extends keyof S>(table: K): Promise<number>;
  abstract bulkPut<K extends keyof S>(table: K, values: RecordType<S, K>[], ttl?: number): Promise<void>;
  abstract bulkDelete<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void>;
  abstract transaction<K extends keyof S, T extends { [P in K]: RecordType<S, P>[] }>(
    tables: K[],
    fn: (stores: T) => Promise<void>,
    ttl?: number,
  ): Promise<void>;

  query<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>> {
    return new QueryBuilder<RecordType<S, K>>(this, String(table));
  }

  async patch<K extends keyof S>(table: K, patches: PatchOperation<RecordType<S, K>, KeyType<S, K>>[]): Promise<void> {
    await Promise.all(
      patches.map((patch) => {
        switch (patch.type) {
          case 'put':
            return this.put(table, patch.value, patch.ttl);
          case 'delete':
            return this.delete(table, patch.key);
          case 'clear':
            return this.clear(table);
          default:
            throw new Error('Unknown patch operation type');
        }
      }),
    );
  }
}

/* -------------------- createDeposit Factory -------------------- */

export function createDeposit<S extends DepositDataSchema>(
  config: DepositBaseAdapter<S> | AdapterConfig<S>,
): DepositBaseAdapter<S> {
  if (!('type' in config)) return config;
  const { type, dbName, version = 1, schema, migrationFn, logger } = config;
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter(dbName, schema, logger);
    case 'indexedDB':
      return new IndexedDBAdapter(dbName, version, schema, migrationFn, logger);
    default:
      throw new Error(`Unknown adapter type: ${type}`);
  }
}

/* -------------------- QueryBuilder -------------------- */

export class QueryBuilder<T extends Record<string, unknown>> {
  private operations: Array<(data: T[]) => T[]> = [];
  private readonly adapter: { getAll(table: string): Promise<unknown[]> };
  private readonly table: string;

  constructor(adapter: { getAll(table: string): Promise<unknown[]> }, table: string) {
    this.adapter = adapter;
    this.table = table;
  }

  private pushOp(op: (data: T[]) => T[]): this {
    this.operations.push(op);
    return this;
  }

  where<K extends keyof T>(field: K, predicate: (value: T[K], record: T) => boolean): this {
    return this.pushOp((data) => data.filter((r) => predicate(r[field], r)));
  }

  equals<K extends keyof T>(field: K, value: T[K]): this {
    return this.pushOp((data) => data.filter((r) => r[field] === value));
  }

  between<K extends keyof T>(field: K, lower: number, upper: number): this {
    return this.pushOp((data) =>
      data.filter((r) => {
        const val = r[field] as any;
        return val >= lower && val <= upper;
      }),
    );
  }

  startsWith<K extends keyof T>(field: K, prefix: string, ignoreCase = false): this {
    const lowerPrefix = ignoreCase ? prefix.toLowerCase() : prefix;
    return this.pushOp((data) =>
      data.filter((r) => {
        const value = r[field];
        if (typeof value !== 'string') return false;
        const str = ignoreCase ? value.toLowerCase() : value;
        return str.startsWith(lowerPrefix);
      }),
    );
  }

  filter(fn: Predicate<T>): this {
    return this.pushOp((data) => data.filter(fn));
  }

  not(fn: Predicate<T>): this {
    return this.pushOp((data) => data.filter((item, idx, arr) => !fn(item, idx, arr)));
  }

  orderBy<K extends keyof T>(field: K, direction: 'asc' | 'desc' = 'asc'): this {
    return this.pushOp(
      (data) => arrange(data, { [field]: direction } as Partial<Record<keyof T, 'asc' | 'desc'>>) as T[],
    );
  }

  limit(n: number): this {
    return this.pushOp((data) => data.slice(0, n));
  }

  offset(n: number): this {
    return this.pushOp((data) => data.slice(n));
  }

  page(pageNumber: number, pageSize: number): this {
    const start = (pageNumber - 1) * pageSize;
    return this.pushOp((data) => data.slice(start, start + pageSize));
  }

  reverse(): this {
    return this.pushOp((data) => [...data].reverse());
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

  async average<K extends keyof T>(field: K): Promise<number> {
    const arr = await this.toArray();
    if (arr.length === 0) return 0;
    const total = arr.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
    return total / arr.length;
  }

  async min<K extends keyof T>(field: K): Promise<T | undefined> {
    return min(await this.toArray(), (item) => item[field] as any);
  }

  async max<K extends keyof T>(field: K): Promise<T | undefined> {
    return max(await this.toArray(), (item) => item[field] as any);
  }

  async sum<K extends keyof T>(field: K): Promise<number> {
    const arr = await this.toArray();
    return arr.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
  }

  map(callback: (record: T) => T): this {
    return this.pushOp((data) => data.map(callback));
  }

  async toGrouped<K extends keyof T>(field: K): Promise<Array<{ key: T[K]; values: T[] }>> {
    const data = await this.toArray();
    const grouped = group(data, (item) => item[field] as any);
    return Object.entries(grouped).map(([key, values]) => ({
      key: key as T[K],
      values: values as T[],
    }));
  }

  search(query: string, tone?: number): this {
    return this.pushOp((data) => search(data as unknown as any[], query, tone) as unknown as T[]);
  }

  reset(): this {
    this.operations = [];
    return this;
  }

  async toArray(): Promise<T[]> {
    let data = (await this.adapter.getAll(this.table)) as T[];
    for (const op of this.operations) data = op(data);
    return data;
  }
}

/* -------------------- LocalStorageAdapter -------------------- */

export class LocalStorageAdapter<S extends DepositDataSchema> extends DepositBaseAdapter<S> {
  private readonly dbName: string;
  private readonly schema: S;
  private readonly logger: Logger;

  constructor(dbName: string, schema: S, logger?: Logger) {
    super();
    validateDepositSchema(schema);
    this.dbName = dbName;
    this.schema = schema;
    this.logger = logger ?? console;
  }

  async get<K extends keyof S, T extends RecordType<S, K>>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: T,
  ): Promise<T | undefined> {
    const storageKey = this.getStorageKey(table, String(key));
    const item = localStorage.getItem(storageKey);
    if (!item) return defaultValue;

    try {
      const parsed = JSON.parse(item);

      if (!parsed || typeof parsed !== 'object') {
        await this.delete(table, key);
        return defaultValue;
      }

      if (isExpired(parsed)) {
        await this.delete(table, key);
        return defaultValue;
      }
      return stripExpiry(parsed) as T;
    } catch (err) {
      this.logger.warn(`Removing corrupted entry for key: ${String(key)}`, err);
      await this.delete(table, key);
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

  async transaction<K extends keyof S, T extends { [P in K]: RecordType<S, P>[] }>(
    tables: K[],
    fn: (stores: T) => Promise<void>,
    ttl?: number,
  ): Promise<void> {
    const storeMap = {} as T;
    await Promise.all(
      tables.map(async (table) => {
        (storeMap as any)[table] = await this.getAll(table);
      }),
    );
    try {
      await fn(storeMap as T);
      await Promise.all(
        tables.map(async (table) => {
          await this.clear(table);
          await this.bulkPut(table, storeMap[table], ttl);
        }),
      );
    } catch (err) {
      throw new Error(`Transaction failed for tables: ${tables.join(', ')}`, { cause: err });
    }
  }

  private getRecordKey<K extends keyof S>(value: Record<string, unknown>, table: K): string | number {
    const keyField = String((this.schema[table] as DepositDataRecord<any>).key);
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

export class IndexedDBAdapter<S extends DepositDataSchema> extends DepositBaseAdapter<S> {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly schema: S;
  private readonly version: number;
  private readonly migrationFn?: DepositMigrationFn<S>;
  private readonly logger: Logger;

  constructor(dbName: string, version: number, schema: S, migrationFn?: DepositMigrationFn<S>, logger?: Logger) {
    super();
    validateDepositSchema(schema);
    this.dbName = dbName;
    this.version = version;
    this.schema = schema;
    this.migrationFn = migrationFn;
    this.logger = logger ?? console;
  }

  async connect(): Promise<void> {
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
            const result = this.migrationFn(db, event.oldVersion, (event as any).newVersion ?? null, tx, this.schema);
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

  async get<K extends keyof S, T extends RecordType<S, K>>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: T,
  ): Promise<T | undefined> {
    return await this.withTransaction(table, 'readonly', async (store) => {
      const result = (await this.requestToPromise(store.get(key as IDBValidKey))) as any;
      if (!result) return defaultValue;

      if (isExpired(result)) {
        await this.delete(table, key);
        return defaultValue;
      }
      return stripExpiry(result) as T;
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

  async transaction<K extends keyof S, T extends { [P in K]: RecordType<S, P>[] }>(
    tables: K[],
    fn: (stores: T) => Promise<void>,
    ttl?: number,
  ): Promise<void> {
    if (!this.db) await this.connect();

    return new Promise<void>((resolve, reject) => {
      const tableNames = tables.map(String);
      const tx = this.db!.transaction(tableNames, 'readwrite');
      const tablesStr = tableNames.join(', ');
      let callbackError: Error | undefined;

      (async () => {
        const storeMap = {} as T;
        await Promise.all(
          tables.map(async (table) => {
            const store = tx.objectStore(String(table));
            const results = await this.requestToPromise(store.getAll());
            (storeMap as any)[table] = results
              .filter((rec) => rec && typeof rec === 'object' && !isExpired(rec))
              .map((rec) => stripExpiry(rec as object));
          }),
        );
        await fn(storeMap as T);
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

      const recordDef = def as DepositDataRecord<any>;
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
