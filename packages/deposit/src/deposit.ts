/** biome-ignore-all lint/suspicious/noExplicitAny: - */

/* ============================================
   deposit - Lightweight client-side data storage
   ============================================ */

import { Logit } from '@vielzeug/logit';
import { arrange, group, max, min, type Predicate, search } from '@vielzeug/toolkit';

/* -------------------- Core Types -------------------- */

export type DepotDataRecord<T, K extends keyof T = keyof T> = {
  key: K;
  record: T;
  indexes?: K[];
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
  get<K extends keyof S, T extends S[K]['record']>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: T,
  ): Promise<T | undefined>;
  getAll<K extends keyof S>(table: K): Promise<S[K]['record'][]>;
  put<K extends keyof S>(table: K, value: S[K]['record'], ttl?: number): Promise<void>;
  delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void>;
  clear<K extends keyof S>(table: K): Promise<void>;
  count<K extends keyof S>(table: K): Promise<number>;
  bulkPut<K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number): Promise<void>;
  bulkDelete<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void>;
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

/* -------------------- Schema Validation -------------------- */

function validateDepositSchema<S extends DepositDataSchema>(schema: S): void {
  for (const [tableName, def] of Object.entries(schema)) {
    const recordDef = def as DepotDataRecord<any>;
    if (!recordDef || recordDef.key === undefined) {
      throw new Error(
        `Invalid schema: table "${tableName}" missing required "key" field. ` +
          'Schema entries must have shape: { key: K, record: T, indexes?: K[] }',
      );
    }
  }
}

/* -------------------- Helper Functions -------------------- */

function wrapWithExpiry<T extends Record<string, unknown>>(value: T, ttl?: number): T & { expiresAt?: number } {
  if (ttl === undefined) return value;
  return { ...value, expiresAt: Date.now() + ttl };
}

function unwrapWithExpiry<T extends Record<string, unknown>>(
  value: T & { expiresAt?: number },
  now: number,
  onExpire?: () => void | Promise<void>,
): T | undefined {
  if (value.expiresAt === undefined) return value;

  if (now >= value.expiresAt) {
    if (onExpire) {
      const result = onExpire();
      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>).catch((err) => {
          const logger = Logit.scope('Deposit');
          logger.warn('Failed to clean up expired entry', err);
        });
      }
    }
    return undefined;
  }

  return value;
}

export function runSafe<T extends (...args: any[]) => any>(fn: T, label = 'OPERATION_FAILED'): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);

      if (result && typeof result.then === 'function') {
        return result.catch((err: Error) => {
          const logger = Logit.scope('Deposit');
          logger.error(label, err);
          return undefined;
        });
      }

      return result;
    } catch (err) {
      const logger = Logit.scope('Deposit');
      logger.error(label, err);
      return undefined;
    }
  }) as unknown as T;
}

/* -------------------- Deposit Class -------------------- */

export class Deposit<S extends DepositDataSchema> {
  private readonly adapter: DepositStorageAdapter<S>;

  constructor(adapterOrConfig: DepositStorageAdapter<S> | AdapterConfig<S>) {
    this.adapter = this.createAdapter(adapterOrConfig);
  }

  private createAdapter(adapterOrConfig: DepositStorageAdapter<S> | AdapterConfig<S>): DepositStorageAdapter<S> {
    if (!('type' in adapterOrConfig)) {
      return adapterOrConfig;
    }

    const { type, dbName, version, schema, migrationFn } = adapterOrConfig;

    switch (type) {
      case 'localStorage':
        return new LocalStorageAdapter(dbName, version, schema);
      case 'indexedDB':
        return new IndexedDBAdapter(dbName, version, schema, migrationFn);
      default:
        throw new Error(`Unknown adapter type: ${type}`);
    }
  }

  get<K extends keyof S, T extends S[K]['record']>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: T,
  ): Promise<T | undefined> {
    return this.adapter.get(table, key, defaultValue);
  }

  getAll<K extends keyof S>(table: K): Promise<S[K]['record'][]> {
    return this.adapter.getAll(table);
  }

  put<K extends keyof S>(table: K, value: S[K]['record'], ttl?: number) {
    return this.adapter.put(table, value, ttl);
  }

  delete<K extends keyof S>(table: K, key: KeyType<S, K>) {
    return this.adapter.delete(table, key);
  }

  clear<K extends keyof S>(table: K) {
    return this.adapter.clear(table);
  }

  count<K extends keyof S>(table: K): Promise<number> {
    return this.adapter.count(table);
  }

  bulkPut<K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number) {
    return this.adapter.bulkPut(table, values, ttl);
  }

  bulkDelete<K extends keyof S>(table: K, keys: KeyType<S, K>[]) {
    return this.adapter.bulkDelete(table, keys);
  }

  query<K extends keyof S>(table: K): QueryBuilder<S[K]['record']> {
    return new QueryBuilder<S[K]['record']>(this.adapter, String(table));
  }

  async transaction<K extends keyof S, T extends { [P in K]: S[P]['record'][] }>(
    tables: K[],
    fn: (stores: T) => Promise<void>,
    ttl?: number,
  ) {
    const storeMap = await this.loadStores<K, T>(tables);
    const proxy = this.createStoreProxy(storeMap);

    try {
      await fn(proxy as T);
      await this.commitStores(tables, proxy, ttl);
    } catch (err) {
      throw new Error(`Transaction failed for tables: ${tables.join(', ')}`, { cause: err });
    }
  }

  private async loadStores<K extends keyof S, T extends { [P in K]: S[P]['record'][] }>(tables: K[]): Promise<T> {
    const storeMap = {} as T;
    const promises = tables.map(async (table) => {
      (storeMap as any)[table] = await this.getAll(table);
    });
    await Promise.all(promises);
    return storeMap;
  }

  private createStoreProxy<T extends Record<string, any>>(storeMap: T): T {
    return new Proxy(storeMap, {
      get(target, prop) {
        return target[prop as keyof T];
      },
      set(target, prop, value) {
        target[prop as keyof T] = value;
        return true;
      },
    }) as T;
  }

  private async commitStores<K extends keyof S, T extends { [P in K]: S[P]['record'][] }>(
    tables: K[],
    stores: T,
    ttl?: number,
  ): Promise<void> {
    const commits = tables.map(async (table) => {
      await this.clear(table);
      await this.bulkPut(table, stores[table], ttl);
    });
    await Promise.all(commits);
  }

  async patch<K extends keyof S>(table: K, patches: PatchOperation<S[K]['record'], KeyType<S, K>>[]): Promise<void> {
    const operations = patches.map((patch) => this.applyPatch(table, patch));
    await Promise.all(operations);
  }

  private async applyPatch<K extends keyof S>(
    table: K,
    patch: PatchOperation<S[K]['record'], KeyType<S, K>>,
  ): Promise<void> {
    switch (patch.type) {
      case 'put':
        return this.put(table, patch.value, patch.ttl);
      case 'delete':
        return this.delete(table, patch.key);
      case 'clear':
        return this.clear(table);
    }
  }
}

/* -------------------- QueryBuilder -------------------- */

export class QueryBuilder<T extends Record<string, unknown>> {
  private operations: Array<{ op: (data: T[]) => T[]; name: string; args: unknown[] }> = [];
  private readonly adapter: DepositStorageAdapter<any>;
  private readonly table: string;
  private memoCache: Map<string, Promise<T[]>> = new Map();
  private dataVersion = 0;
  private hasMutatingOp = false;
  private cachedSignature: string | null = null;

  constructor(adapter: DepositStorageAdapter<any>, table: string) {
    this.adapter = adapter;
    this.table = table;
  }

  private getOpSignature(): string {
    if (this.cachedSignature === null) {
      this.cachedSignature = this.operations.map((o) => `${o.name}:${JSON.stringify(o.args)}`).join('|');
    }
    return this.cachedSignature;
  }

  private getMemoKey(): string {
    return `${this.getOpSignature()}|v${this.dataVersion}`;
  }

  private invalidateMemo(predicate?: (key: string) => boolean): void {
    if (!predicate) {
      this.memoCache.clear();
      return;
    }
    const keysToDelete = Array.from(this.memoCache.keys()).filter(predicate);
    for (const key of keysToDelete) {
      this.memoCache.delete(key);
    }
  }

  private pushOp(op: (data: T[]) => T[], name = 'op', args: unknown[] = []): this {
    this.operations.push({ args, name, op });
    this.cachedSignature = null;
    const opSignature = this.getOpSignature();
    this.invalidateMemo((key: string) => key.startsWith(opSignature));
    return this;
  }

  where<K extends keyof T>(field: K, predicate: (value: T[K], record: T) => boolean): this {
    return this.pushOp((data) => data.filter((r) => predicate(r[field], r)), 'where', [field, predicate]);
  }

  equals<K extends keyof T>(field: K, value: T[K]): this {
    return this.pushOp((data) => data.filter((r) => r[field] === value), 'equals', [field, value]);
  }

  between<K extends keyof T>(field: K, lower: number, upper: number): this {
    return this.pushOp(
      (data) =>
        data.filter((r) => {
          const val = r[field] as any;
          return val >= lower && val <= upper;
        }),
      'between',
      [field, lower, upper],
    );
  }

  startsWith<K extends keyof T>(field: K, prefix: string, ignoreCase = false): this {
    const lowerPrefix = ignoreCase ? prefix.toLowerCase() : prefix;
    return this.pushOp(
      (data) =>
        data.filter((r) => {
          const value = r[field];
          if (typeof value !== 'string') return false;
          const str = ignoreCase ? value.toLowerCase() : value;
          return str.startsWith(lowerPrefix);
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

  orderBy<K extends keyof T>(field: K, direction: 'asc' | 'desc' = 'asc'): this {
    return this.pushOp(
      (data) => arrange(data, { [field]: direction } as Partial<Record<keyof T, 'asc' | 'desc'>>) as T[],
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

  modify(callback: (record: T) => T | undefined, context?: { field: keyof T; value: unknown }): this {
    this.hasMutatingOp = true;
    this.dataVersion++;
    this.invalidateModifyCache(context);

    return this.pushOp((data) => data.map((item) => callback(item) ?? item), 'modify', [callback]);
  }

  private invalidateModifyCache(context?: { field: keyof T; value: unknown }): void {
    if (!context?.field) {
      this.invalidateMemo((key: string) => key.includes('modify'));
      return;
    }

    const fieldStr = String(context.field);
    this.invalidateMemo(
      (key: string) =>
        key.includes(`"${fieldStr}"`) && (context.value === undefined || key.includes(JSON.stringify(context.value))),
    );
  }

  groupBy<K extends keyof T>(field: K): this {
    return this.pushOp((data) => group(data, (item) => item[field] as any) as unknown as T[], 'groupBy', [field]);
  }

  async toGrouped<K extends keyof T>(field: K): Promise<Array<{ key: T[K]; values: T[] }>> {
    const data = await this.executeOperations();
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
    this.hasMutatingOp = false;
    this.cachedSignature = null;
    this.invalidateMemo();
    return this;
  }

  async toArray(): Promise<T[]> {
    const key = this.getMemoKey();
    const cached = this.memoCache.get(key);
    if (cached) return cached;

    const promise = this.executeOperations();
    if (!this.hasMutatingOp) {
      this.memoCache.set(key, promise);
    }
    return promise;
  }

  private async executeOperations(): Promise<T[]> {
    const originalData = (await this.adapter.getAll(this.table)) as T[];
    let data = originalData.slice();

    for (const { op } of this.operations) {
      data = op(data);
    }

    return data;
  }

  build(conditions: Array<QueryCondition<T>>): this {
    for (const cond of conditions) {
      this.applyCondition(cond);
    }
    return this;
  }

  private applyCondition(cond: QueryCondition<T>): void {
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
      default:
        throw new Error(`Unknown query type: ${(cond as any).type}`);
    }
  }
}

/* -------------------- LocalStorageAdapter -------------------- */

export class LocalStorageAdapter<S extends DepositDataSchema> implements DepositStorageAdapter<S> {
  private readonly dbName: string;
  private readonly version: number;
  private schema: S;

  constructor(dbName: string, version: number, schema: S) {
    validateDepositSchema(schema);
    this.dbName = dbName;
    this.version = version;
    this.schema = schema;
  }

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
    const keys = this.getTableKeys(prefix);
    const records: S[K]['record'][] = [];

    for (const k of keys) {
      const record = await this.parseStorageRecord<K>(k, table, now);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }, 'GET_ALL_FAILED');

  put = runSafe(async <K extends keyof S>(table: K, value: S[K]['record'], ttl?: number) => {
    const key = this.getRecordKey(value, table);
    if (key === undefined) throw new Error('Missing key for localStorage put');
    localStorage.setItem(this.getStorageKey(table, String(key)), JSON.stringify(wrapWithExpiry(value, ttl)));
  }, 'PUT_FAILED');

  delete = runSafe(async <K extends keyof S>(table: K, key: KeyType<S, K>) => {
    localStorage.removeItem(this.getStorageKey(table, String(key)));
  }, 'DELETE_FAILED');

  clear = runSafe(async <K extends keyof S>(table: K) => {
    const prefix = this.getStorageKey(table);
    const keysToRemove = this.getTableKeys(prefix);
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  }, 'CLEAR_FAILED');

  count = runSafe(async <K extends keyof S>(table: K): Promise<number> => {
    return (await this.getAll(table)).length;
  }, 'COUNT_FAILED');

  bulkPut = runSafe(async <K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number) => {
    const promises = values.map((v) => this.put(table, v, ttl));
    await Promise.all(promises);
  }, 'BULK_PUT_FAILED');

  bulkDelete = runSafe(async <K extends keyof S>(table: K, keys: KeyType<S, K>[]) => {
    const promises = keys.map((key) => this.delete(table, key));
    await Promise.all(promises);
  }, 'BULK_DELETE_FAILED');

  private getTableKeys(prefix: string): string[] {
    return Object.keys(localStorage).filter((k) => k.startsWith(prefix));
  }

  private async parseStorageRecord<K extends keyof S>(
    storageKey: string,
    table: K,
    now: number,
  ): Promise<S[K]['record'] | undefined> {
    try {
      const item = localStorage.getItem(storageKey);
      if (!item) return undefined;

      const raw = JSON.parse(item);
      return unwrapWithExpiry<S[K]['record']>(raw, now, async () => {
        try {
          const idPart = this.extractKeyFromStorageKey(storageKey);
          await this.delete(table, idPart as KeyType<S, typeof table>);
        } catch (err) {
          const logger = Logit.scope('Deposit');
          logger.warn(`Failed to delete expired entry: ${storageKey}`, err);
        }
      });
    } catch (err) {
      try {
        const idPart = this.extractKeyFromStorageKey(storageKey);
        await this.delete(table, idPart as KeyType<S, typeof table>);
      } catch (deleteErr) {
        const logger = Logit.scope('Deposit');
        logger.warn(`Failed to delete corrupted entry: ${storageKey}`, deleteErr);
      }

      const logger = Logit.scope('Deposit');
      logger.warn(`Skipping corrupted entry: ${storageKey}`, err);
      return undefined;
    }
  }

  private extractKeyFromStorageKey(storageKey: string): string {
    const parts = storageKey.split(':');
    if (parts.length < 4) {
      throw new Error(`Invalid storage key format: ${storageKey}`);
    }
    return decodeURIComponent(parts[parts.length - 1]);
  }

  private getRecordKey<K extends keyof S>(value: Record<string, unknown>, table: K): string | number | undefined {
    const keyField = String((this.schema[table] as DepotDataRecord<any>).key);
    const keyValue = value[keyField];

    if (keyValue === undefined || keyValue === null) {
      throw new Error(`Missing required key field "${keyField}" in record for table "${String(table)}"`);
    }

    return keyValue as string | number | undefined;
  }

  private getStorageKey<K extends keyof S>(table: K, key?: string | number): string {
    const prefix = `${encodeURIComponent(this.dbName)}:${this.version}:${encodeURIComponent(String(table))}:`;
    return key === undefined || key === '' ? prefix : prefix + encodeURIComponent(String(key));
  }
}

/* -------------------- IndexedDBAdapter -------------------- */

export class IndexedDBAdapter<S extends DepositDataSchema> implements DepositStorageAdapter<S> {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly schema: S;
  private readonly version: number;
  private readonly migrationFn?: DepositMigrationFn<S>;

  constructor(dbName: string, version: number, schema: S, migrationFn?: DepositMigrationFn<S>) {
    validateDepositSchema(schema);
    this.dbName = dbName;
    this.version = version;
    this.schema = schema;
    this.migrationFn = migrationFn;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const tx = request.transaction!;

        this.createObjectStores(db);
        this.executeMigration(db, event, tx, reject);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    });
  }

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

  delete = runSafe(async <K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await this.requestToPromise(store.delete(key as IDBKeyRange));
    });
  }, 'DELETE_FAILED');

  clear = runSafe(async <K extends keyof S>(table: K): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await this.requestToPromise(store.clear());
    });
  }, 'CLEAR_FAILED');

  count = runSafe(async <K extends keyof S>(table: K): Promise<number> => {
    const records = await this.getAll(table);
    return records.length;
  }, 'COUNT_FAILED');

  bulkPut = runSafe(async <K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      const promises = values.map((value) => this.requestToPromise(store.put(wrapWithExpiry(value, ttl))));
      await Promise.all(promises);
    });
  }, 'BULK_PUT_FAILED');

  bulkDelete = runSafe(async <K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      const promises = keys.map((key) => this.requestToPromise(store.delete(key as IDBKeyRange)));
      await Promise.all(promises);
    });
  }, 'BULK_DELETE_FAILED');

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Schema creation requires validation logic
  private createObjectStores(db: IDBDatabase): void {
    for (const [name, def] of Object.entries(this.schema)) {
      if (db.objectStoreNames.contains(name)) continue;

      const recordDef = def as DepotDataRecord<any>;
      const keyPath = recordDef.key as string;
      const store = db.createObjectStore(name, { keyPath });

      const indexes = recordDef.indexes;
      if (indexes && Array.isArray(indexes)) {
        const createdIndexes = new Set<string>();

        for (const index of indexes) {
          const indexName = index as string;

          if (createdIndexes.has(indexName)) {
            const logger = Logit.scope('Deposit');
            logger.warn(`Duplicate index "${indexName}" in table "${name}" schema - skipping`);
            continue;
          }

          if (indexName === keyPath) {
            const logger = Logit.scope('Deposit');
            logger.warn(`Skipping index on key path "${indexName}" in table "${name}" - redundant`);
            continue;
          }

          try {
            store.createIndex(indexName, indexName);
            createdIndexes.add(indexName);
          } catch (err) {
            const logger = Logit.scope('Deposit');
            logger.error(`Failed to create index "${indexName}" in table "${name}"`, err);
          }
        }
      }
    }
  }

  private executeMigration(
    db: IDBDatabase,
    event: IDBVersionChangeEvent,
    tx: IDBTransaction,
    reject: (error: Error) => void,
  ): void {
    if (!this.migrationFn) return;

    const handleError = (err: unknown) => {
      this.abortTransaction(tx);
      reject(new Error('Migration failed', { cause: err }));
    };

    try {
      const result = this.migrationFn(db, event.oldVersion, (event as any).newVersion ?? null, tx, this.schema);
      Promise.resolve(result).catch(handleError);
    } catch (err) {
      handleError(err);
    }
  }

  private abortTransaction(tx: IDBTransaction): void {
    runSafe(() => tx.abort(), 'TRANSACTION_ABORT_FAILED')();
  }

  private async withTransaction<T>(
    tables: keyof S | (keyof S)[],
    mode: 'readonly' | 'readwrite',
    fn: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    if (!this.db) await this.connect();

    return new Promise<T>((resolve, reject) => {
      const tableNames = Array.isArray(tables) ? tables.map(String) : [String(tables)];
      const tx = this.db!.transaction(tableNames, mode);
      const store = tx.objectStore(tableNames[0]);
      const tablesStr = tableNames.join(', ');

      let result: T | undefined;
      let callbackError: Error | undefined;

      fn(store)
        .then((r) => {
          result = r;
        })
        .catch((err) => {
          callbackError = err;
          this.abortTransaction(tx);
        });

      tx.oncomplete = () => {
        if (callbackError) {
          reject(new Error(`Transaction callback failed for ${tablesStr}`, { cause: callbackError }));
        } else {
          resolve(result as T);
        }
      };

      tx.onerror = () => reject(new Error(`Transaction error for ${tablesStr}`, { cause: tx.error }));

      tx.onabort = () => {
        const error = callbackError || tx.error || new Error('Transaction aborted');
        reject(new Error(`Transaction aborted for ${tablesStr}`, { cause: error }));
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
