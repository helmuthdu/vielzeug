/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { Logit } from '@vielzeug/logit';
import { group, max, min, type Predicate, search, sortBy } from '@vielzeug/toolkit';

export type DepotDataRecord<T, K extends keyof T = keyof T> = {
  indexes?: K[];
  key: K;
  record: T;
};

type DataSchemaDef = Record<string, Record<string, unknown>>;

export type DepositDataSchema<S = DataSchemaDef> = {
  [K in keyof S]: DepotDataRecord<S[K], keyof S[K]>;
};

export type DepositMigrationFn<S extends DepositDataSchema> = (
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBTransaction,
  schema: S,
) => void | Promise<void>;

export type DepositStorageAdapter<S extends DepositDataSchema> = {
  bulkDelete<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void>;
  bulkPut<K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number): Promise<void>;
  clear<K extends keyof S>(table: K): Promise<void>;
  count<K extends keyof S>(table: K): Promise<number>;
  delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void>;
  get<K extends keyof S, T extends S[K]['record']>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: T,
  ): Promise<T | undefined>;
  getAll<K extends keyof S>(table: K): Promise<S[K]['record'][]>;
  put<K extends keyof S>(table: K, value: S[K]['record'], ttl?: number): Promise<void>;
  connect?(): Promise<void>;
};

type QueryCondition<T, K extends keyof T = keyof T> =
  | { type: 'equals'; field: K; value: T[K] }
  | { type: 'between'; field: K; lower: T[K]; upper: T[K] }
  | { type: 'startsWith'; field: Extract<K, string & keyof T>; value: string }
  | { type: 'where'; field: K; fn: (value: T[K], record: T) => boolean }
  | { type: 'filter'; fn: (record: T) => boolean }
  | { type: 'orderBy'; field: K; value?: 'asc' | 'desc' }
  | { type: 'limit'; value: number }
  | { type: 'offset'; value: number }
  | { type: 'page'; pageNumber: number; pageSize: number };

type PatchOperation<T, K = any> =
  | { type: 'put'; value: T; ttl?: number }
  | { type: 'delete'; key: K }
  | { type: 'clear' };

type KeyType<S extends DepositDataSchema, K extends keyof S> = S[K]['record'][S[K]['key']];

type AdapterConfig<S extends DepositDataSchema> = {
  type: 'localStorage' | 'indexedDB';
  dbName: string;
  version: number;
  schema: S;
  migrationFn?: DepositMigrationFn<S>;
};

export class Deposit<S extends DepositDataSchema> {
  private readonly adapter: DepositStorageAdapter<S>;
  constructor(adapterOrConfig: DepositStorageAdapter<S> | AdapterConfig<S>) {
    if (typeof adapterOrConfig === 'object' && 'type' in adapterOrConfig) {
      const config = adapterOrConfig as AdapterConfig<S>;
      switch (config.type) {
        case 'localStorage':
          this.adapter = new LocalStorageAdapter(config.dbName, config.version, config.schema);
          break;
        case 'indexedDB':
          this.adapter = new IndexedDBAdapter(config.dbName, config.version, config.schema, config.migrationFn);
          break;
        default:
          throw new Error(`Unknown adapter type: ${config.type}`);
      }
    } else {
      this.adapter = adapterOrConfig;
    }
  }

  bulkDelete<K extends keyof S>(table: K, keys: KeyType<S, K>[]) {
    return this.adapter.bulkDelete(table, keys);
  }

  bulkPut<K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number) {
    return this.adapter.bulkPut(table, values, ttl);
  }

  clear<K extends keyof S>(table: K) {
    return this.adapter.clear(table);
  }

  count<K extends keyof S>(table: K): Promise<number> {
    return this.adapter.count(table);
  }

  delete<K extends keyof S>(table: K, key: KeyType<S, K>) {
    return this.adapter.delete(table, key);
  }

  get<K extends keyof S, T extends S[K]['record']>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: T,
  ): Promise<T | undefined> {
    try {
      return this.adapter.get(table, key, defaultValue);
    } catch (err) {
      throw new Error(`Error getting record from table ${String(table)}, key ${String(key)}`, { cause: err });
    }
  }

  getAll<K extends keyof S>(table: K): Promise<S[K]['record'][]> {
    try {
      return this.adapter.getAll(table);
    } catch (err) {
      throw new Error(`Error getting all records from table ${String(table)}`, { cause: err });
    }
  }

  put<K extends keyof S>(table: K, value: S[K]['record'], ttl?: number) {
    return this.adapter.put(table, value, ttl);
  }

  query<K extends keyof S>(table: K): QueryBuilder<S[K]['record']> {
    return new QueryBuilder<S[K]['record']>(this.adapter, String(table));
  }

  async transaction<K extends keyof S, T extends { [P in K]: S[P]['record'][] }>(
    tables: K[],
    fn: (stores: T) => Promise<void>,
    ttl?: number,
  ) {
    const storeMap = {} as T;

    await Promise.all(
      tables.map(async (table) => {
        (storeMap as any)[table] = await this.getAll(table);
      }),
    );

    // Use a Proxy to allow reassignment of store arrays (e.g., stores.users = ...)
    const proxy = new Proxy(storeMap, {
      get(target, prop) {
        return target[prop as keyof T];
      },
      set(target, prop, value) {
        target[prop as keyof T] = value;
        return true;
      },
    });

    try {
      await fn(proxy as T);
      await Promise.all(
        tables.map(async (table) => {
          await this.clear(table); // Ensure table is cleared before bulkPut
          await this.bulkPut(table, proxy[table], ttl);
        }),
      );
    } catch (err) {
      throw new Error('Transaction failed', { cause: err });
    }
  }

  async patch<K extends keyof S>(table: K, patches: PatchOperation<S[K]['record'], KeyType<S, K>>[]): Promise<void> {
    for (const patch of patches) {
      if (patch.type === 'put') {
        await this.put(table, patch.value, patch.ttl);
      } else if (patch.type === 'delete') {
        await this.delete(table, patch.key as KeyType<S, K>);
      } else if (patch.type === 'clear') {
        await this.clear(table);
      }
    }
  }
}

/** -------------------- QueryBuilder -------------------- **/

export class QueryBuilder<T extends Record<string, unknown>> {
  private operations: Array<{ op: (data: T[]) => T[]; name: string; args: unknown[] }> = [];
  private readonly adapter: DepositStorageAdapter<any>;
  private readonly table: string;
  private memoCache: Map<string, Promise<T[]>> = new Map();
  private dataVersion = 0;
  private hasMutatingOp = false;

  constructor(adapter: DepositStorageAdapter<any>, table: string) {
    this.adapter = adapter;
    this.table = table;
  }

  private getOpSignature(): string {
    return this.operations.map((o) => `${o.name}:${JSON.stringify(o.args)}`).join('|');
  }

  private getMemoKey(): string {
    return `${this.getOpSignature()}|v${this.dataVersion}`;
  }

  /**
   * Invalidate cache entries matching a predicate. If no predicate is provided, clear all.
   */
  private invalidateMemo(predicate?: (key: string) => boolean) {
    if (!predicate) {
      this.memoCache.clear();
      return;
    }
    for (const key of Array.from(this.memoCache.keys())) {
      if (predicate(key)) {
        this.memoCache.delete(key);
      }
    }
  }

  private pushOp(op: (data: T[]) => T[], name = 'op', args: unknown[] = []): this {
    this.operations.push({ args, name, op });
    // Only invalidate cache entries that match the new operation signature
    const opSignature = this.getOpSignature();
    this.invalidateMemo((key: string) => key.startsWith(opSignature));
    return this;
  }

  /** ---- Core select/where operations (no implicit state) ---- */

  where<K extends keyof T>(field: K, predicate: (value: T[K], record: T) => boolean): this {
    return this.pushOp((data) => data.filter((r) => predicate(r[field], r)), 'where', [field, predicate]);
  }

  equals<K extends keyof T>(field: K, value: T[K]): this {
    return this.pushOp((data) => data.filter((r) => r[field] === value), 'equals', [field, value]);
  }

  between<K extends keyof T>(field: K, lower: number, upper: number): this {
    return this.pushOp(
      (data) => data.filter((r) => (r[field] as any) >= lower && (r[field] as any) <= upper),
      'between',
      [field, lower, upper],
    );
  }

  startsWith<K extends keyof T>(field: K, prefix: string, ignoreCase = false): this {
    return this.pushOp(
      (data) =>
        data.filter((r) => {
          const value = r[field];
          if (typeof value !== 'string') return false;
          if (ignoreCase) {
            return value.toLowerCase().startsWith(prefix.toLowerCase());
          }
          return value.startsWith(prefix);
        }),
      'startsWith',
      [field, prefix, ignoreCase],
    );
  }

  filter(fn: Predicate<T>): this {
    return this.pushOp((data) => data.filter(fn), 'filter', [fn]);
  }

  not(fn: Predicate<T>): this {
    return this.pushOp((data) => data.filter((item, idx, arr) => !fn(item, idx, arr)), 'not', [fn]);
  }

  and(...fns: Array<Predicate<T>>): this {
    return this.pushOp((data) => data.filter((item, idx, arr) => fns.every((fn) => fn(item, idx, arr))), 'and', fns);
  }

  or(...fns: Array<Predicate<T>>): this {
    return this.pushOp((data) => data.filter((item, idx, arr) => fns.some((fn) => fn(item, idx, arr))), 'or', fns);
  }

  /** ---- Ordering / slicing ---- */

  orderBy<K extends keyof T>(field: K, direction: 'asc' | 'desc' = 'asc'): this {
    return this.pushOp(
      (data) => sortBy(data, { [field]: direction } as Partial<Record<keyof T, 'asc' | 'desc'>>) as T[],
      'orderBy',
      [field, direction],
    );
  }

  limit(n: number): this {
    return this.pushOp((data) => data.slice(0, n), 'limit', [n]);
  }

  offset(n: number): this {
    return this.pushOp((data) => data.slice(n), 'offset', [n]);
  }

  page(pageNumber: number, pageSize: number): this {
    return this.pushOp(
      (data) => {
        const start = (pageNumber - 1) * pageSize;
        const end = start + pageSize;
        return data.slice(start, end);
      },
      'page',
      [pageNumber, pageSize],
    );
  }

  reverse(): this {
    return this.pushOp((data) => [...data].reverse(), 'reverse', []);
  }

  /** ---- Aggregations ---- */

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
    if (!arr.length) return 0;
    return (await this.sum(field)) / arr.length;
  }

  async min<K extends keyof T>(field: K): Promise<T | undefined> {
    return min(await this.toArray(), (item) => item[field] as any);
  }

  async max<K extends keyof T>(field: K): Promise<T | undefined> {
    return max(await this.toArray(), (item) => item[field] as any);
  }

  async sum<K extends keyof T>(field: K): Promise<number> {
    return (await this.toArray()).reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
  }

  /** ---- Transformations ---- */

  // Mutates records in-place; we disable memoization after such ops for safety.
  modify(callback: (record: T) => T | undefined, context?: { field: keyof T; value: unknown }): this {
    this.hasMutatingOp = true;
    this.dataVersion++;
    if (context?.field) {
      // Invalidate only cache entries whose signature includes the field and value
      this.invalidateMemo(
        (key: string) =>
          key.includes(`"${String(context.field)}"`) &&
          (context.value === undefined || key.includes(JSON.stringify(context.value))),
      );
    } else {
      // Fallback: Invalidate only cache entries that include 'modify' in their signature
      this.invalidateMemo((key: string) => key.includes('modify'));
    }
    return this.pushOp(
      (data) =>
        data.map((item) => {
          const result = callback(item);
          return result !== undefined ? result : item;
        }),
      'modify',
      [callback],
    );
  }

  groupBy<K extends keyof T>(field: K): this {
    return this.pushOp((data) => group(data, (item) => item[field] as any) as unknown as T[]);
  }

  search(query: string, tone?: number): this {
    return this.pushOp((data) => search(data as unknown as any[], query, tone) as unknown as T[]);
  }

  /** ---- Execution / state ---- */

  reset(): this {
    this.operations = [];
    this.hasMutatingOp = false;
    this.invalidateMemo();
    return this;
  }

  async toArray(): Promise<T[]> {
    const key = this.getMemoKey();
    if (this.memoCache.has(key)) return this.memoCache.get(key)!;
    const originalData = (await this.adapter.getAll(this.table)) as T[];
    let data = [...originalData];
    for (const { op } of this.operations) {
      data = op(data);
    }
    const result = Promise.resolve(data);
    if (!this.hasMutatingOp) {
      this.memoCache.set(key, result);
    }
    return result;
  }

  /** ---- Query builder DSL (typed) ---- */

  build(conditions: Array<QueryCondition<T>>): this {
    for (const cond of conditions) {
      switch (cond.type) {
        case 'equals':
          this.equals(cond.field as any, cond.value as any);
          break;
        case 'between':
          this.between(cond.field as any, cond.lower as any, cond.upper as any);
          break;
        case 'startsWith':
          this.startsWith(cond.field as any, cond.value);
          break;
        case 'where':
          this.where(cond.field as any, cond.fn as any);
          break;
        case 'filter':
          this.filter(cond.fn);
          break;
        case 'orderBy':
          this.orderBy(cond.field as any, cond.value ?? 'asc');
          break;
        case 'limit':
          this.limit(cond.value);
          break;
        case 'offset':
          this.offset(cond.value);
          break;
        case 'page':
          this.page(cond.pageNumber, cond.pageSize);
          break;
        default: {
          throw new Error(`Unknown query type: ${(cond as any).type}`);
        }
      }
    }
    return this;
  }
}

/** -------------------- LocalStorageAdapter -------------------- **/

export class LocalStorageAdapter<S extends DepositDataSchema> implements DepositStorageAdapter<S> {
  private readonly dbName: string;
  private readonly version: number;
  private schema: S;

  constructor(dbName: string, version: number, schema: S) {
    this.dbName = dbName;
    this.version = version;
    this.schema = schema;
  }

  bulkDelete = runSafe(async <K extends keyof S>(table: K, keys: KeyType<S, K>[]) => {
    await Promise.all(keys.map((key) => this.delete(table, key)));
  }, 'BULK_DELETE_FAILED');

  bulkPut = runSafe(async <K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number) => {
    await Promise.all(values.map((v) => this.put(table, v, ttl)));
  }, 'BULK_PUT_FAILED');

  clear = runSafe(async <K extends keyof S>(table: K) => {
    const prefix = this.getStorageKey(table);
    const keysToRemove = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  }, 'CLEAR_FAILED');

  count = runSafe(async <K extends keyof S>(table: K): Promise<number> => {
    return (await this.getAll(table)).length;
  }, 'COUNT_FAILED');

  delete = runSafe(async <K extends keyof S>(table: K, key: KeyType<S, K>) => {
    localStorage.removeItem(this.getStorageKey(table, String(key)));
  }, 'DELETE_FAILED');

  get = runSafe(
    async <K extends keyof S, T extends S[K]['record']>(
      table: K,
      key: KeyType<S, K>,
      defaultValue?: T,
    ): Promise<T | undefined> => {
      const storageKey = this.getStorageKey(table, String(key));
      const item = localStorage.getItem(storageKey);
      if (!item) return defaultValue;
      try {
        const raw = JSON.parse(item);
        const now = Date.now();
        const value = unwrapWithExpiry<T>(raw, now, async () => await this.delete(table, key));
        return value ?? defaultValue;
      } catch {
        await this.delete(table, key);
        return defaultValue;
      }
    },
    'GET_FAILED',
  );

  getAll = runSafe(async <K extends keyof S>(table: K): Promise<S[K]['record'][]> => {
    const prefix = this.getStorageKey(table);
    const now = Date.now();
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
    const records: S[K]['record'][] = [];
    for (const k of keys) {
      try {
        const raw = JSON.parse(localStorage.getItem(k) ?? '{}');
        const value = unwrapWithExpiry<S[K]['record']>(raw, now, async () => {
          const parts = k.split(':');
          const idPart = parts[parts.length - 1];
          await this.delete(table, idPart as KeyType<S, typeof table>);
        });
        if (value !== undefined) records.push(value);
      } catch (err) {
        const parts = k.split(':');
        const idPart = parts[parts.length - 1];
        await this.delete(table, idPart as KeyType<S, typeof table>);
        throw new Error(`Corrupted JSON for key: ${k}`, { cause: err });
      }
    }
    return records;
  }, 'GET_ALL_FAILED');

  put = runSafe(async <K extends keyof S>(table: K, value: S[K]['record'], ttl?: number) => {
    const key = this.getKey(value, table);
    if (key === undefined) throw new Error('Missing key for localStorage put');
    localStorage.setItem(this.getStorageKey(table, String(key)), JSON.stringify(wrapWithExpiry(value, ttl)));
  }, 'PUT_FAILED');

  private getKey<K extends keyof S>(value: Record<string, unknown>, table: K): string | number | undefined {
    return value[String((this.schema[table] as DepotDataRecord<any>).key)] as string | number | undefined;
  }

  private getStorageKey<K extends keyof S>(table: K, key?: string | number): string {
    const prefix = `${this.dbName}:${this.version}:${String(table)}:`;
    return key === undefined || key === '' ? prefix : `${prefix}${String(key)}`;
  }
}

/** -------------------- IndexedDBAdapter -------------------- **/

export class IndexedDBAdapter<S extends DepositDataSchema> implements DepositStorageAdapter<S> {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly schema: S;
  private readonly version: number;
  private readonly migrationFn?: DepositMigrationFn<S>;

  constructor(dbName: string, version: number, schema: S, migrationFn?: DepositMigrationFn<S>) {
    this.dbName = dbName;
    this.version = version;
    this.schema = schema;
    this.migrationFn = migrationFn;
  }

  bulkDelete = runSafe(async <K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await Promise.all(keys.map((key) => this.requestToPromise(store.delete(key as IDBKeyRange))));
    });
  }, 'BULK_DELETE_FAILED');

  bulkPut = runSafe(async <K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      for (const value of values) {
        await this.requestToPromise(store.put(wrapWithExpiry(value, ttl)));
      }
    });
  }, 'BULK_PUT_FAILED');

  clear = runSafe(async <K extends keyof S>(table: K): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await this.requestToPromise(store.clear());
    });
  }, 'CLEAR_FAILED');

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
      request.onupgradeneeded = (event) => {
        const db = request.result;
        const tx = request.transaction!;
        for (const [name, def] of Object.entries(this.schema)) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: (def as DepotDataRecord<any>).key as string });
            const indexes = (def as DepotDataRecord<any>).indexes;
            if (indexes) {
              for (const index of indexes) {
                store.createIndex(index as string, index as string);
              }
            }
          }
        }
        if (this.migrationFn) {
          try {
            const maybePromise = this.migrationFn(
              db,
              event.oldVersion,
              (event as any).newVersion ?? null,
              tx,
              this.schema,
            );
            if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
              (maybePromise as Promise<void>).catch((err) => {
                runSafe(() => request.transaction?.abort(), 'TRANSACTION_ABORT_FAILED');
                reject(new Error('Migration failed', { cause: err }));
              });
            }
          } catch (err) {
            runSafe(() => request.transaction?.abort(), 'TRANSACTION_ABORT_FAILED');
            reject(new Error('Migration failed', { cause: err }));
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

  count = runSafe(async <K extends keyof S>(table: K): Promise<number> => {
    const records = await this.getAll(table);
    return records.length;
  }, 'COUNT_FAILED');

  delete = runSafe(async <K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await this.requestToPromise(store.delete(key as IDBKeyRange));
    });
  }, 'DELETE_FAILED');

  get = runSafe(
    async <K extends keyof S, T extends S[K]['record']>(
      table: K,
      key: KeyType<S, K>,
      defaultValue?: T,
    ): Promise<T | undefined> => {
      return await this.withTransaction(table, 'readonly', async (store) => {
        const result = (await this.requestToPromise(store.get(key as IDBKeyRange))) as any;
        if (!result) return defaultValue;
        const now = Date.now();
        const value = unwrapWithExpiry<T>(result, now, async () => await this.delete(table, key));
        return value ?? defaultValue;
      });
    },
    'GET_FAILED',
  );

  getAll = runSafe(async <K extends keyof S>(table: K): Promise<S[K]['record'][]> => {
    return await this.withTransaction(table, 'readonly', async (store) => {
      const result = await this.requestToPromise(store.getAll());
      const now = Date.now();
      return result
        .map((rec) => unwrapWithExpiry<S[K]['record']>(rec, now))
        .filter((v): v is S[K]['record'] => v !== undefined);
    });
  }, 'GET_ALL_FAILED');

  put = runSafe(async <K extends keyof S>(table: K, value: S[K]['record'], ttl?: number): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await this.requestToPromise(store.put(wrapWithExpiry(value, ttl)));
    });
  }, 'PUT_FAILED');

  /**
   * Ensures `fn` runs within a transaction that actually completes before resolving.
   * We resolve after `transaction.oncomplete`, not just after `fn` finishes.
   */
  private async withTransaction<T>(
    tables: keyof S | (keyof S)[],
    mode: 'readonly' | 'readwrite',
    fn: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    if (!this.db) await this.connect();

    return new Promise<T>((resolve, reject) => {
      const tx = this.db!.transaction(Array.isArray(tables) ? tables.map(String) : [String(tables)], mode);
      const store = tx.objectStore(Array.isArray(tables) ? String(tables[0]) : String(tables));

      let result: T | undefined;
      fn(store)
        .then((r) => {
          result = r;
        })
        .catch((e) => {
          runSafe(() => tx.abort(), 'TRANSACTION_ABORT_FAILED');
          reject(e);
        });

      tx.oncomplete = () => resolve(result as T);
      tx.onerror = (event) => reject(event);
      tx.onabort = (event) => reject(event);
    });
  }

  private requestToPromise<R>(req: IDBRequest<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    });
  }
}

/**
 * Wraps a value with an expiry timestamp.
 */
function wrapWithExpiry<T extends Record<string, unknown>>(value: T, ttl?: number): T & { expiresAt?: number } {
  if (ttl === undefined) return value;
  const now = Date.now();
  return { ...value, expiresAt: now + ttl };
}

/**
 * Unwraps a value from an expiry wrapper, deleting the key if expired.
 */
function unwrapWithExpiry<T extends Record<string, unknown>>(
  value: T & { expiresAt?: number },
  now: number,
  onExpire?: () => Promise<void>,
): T | undefined {
  if (value.expiresAt === undefined) return value;
  if (now >= value.expiresAt) {
    onExpire?.();
    return undefined;
  }
  return value;
}

/** -------------------- runSafe -------------------- **/

/**
 * Wraps a function to suppress errors and log them to the console.
 */
export function runSafe<T extends (...args: any[]) => any>(fn: T, label = 'runSafe'): T {
  return ((...args: any[]) => {
    try {
      return fn(...args);
    } catch (err) {
      Logit.error(label, err);
    }
  }) as unknown as T;
}
