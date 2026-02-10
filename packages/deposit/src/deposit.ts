/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { Logit } from '@vielzeug/logit';
import { arrange, group, max, min, type Predicate, search } from '@vielzeug/toolkit';

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

/**
 * Extracts the key type for a given table in the schema.
 * Returns the type of the record's key field.
 */
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
    return this.adapter.get(table, key, defaultValue);
  }

  getAll<K extends keyof S>(table: K): Promise<S[K]['record'][]> {
    return this.adapter.getAll(table);
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

/** -------------------- QueryBuilder -------------------- **/

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
    this.cachedSignature = null; // Invalidate cached signature
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

  /** ---- Ordering / slicing ---- */

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

  /** ---- Transformations ---- */

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

  /**
   * Groups records by a field value.
   *
   * @param field - The field to group by
   * @returns QueryBuilder instance for chaining
   *
   * @remarks
   * This method changes the result structure. The return type is cast to `T[]` for chaining,
   * but the actual structure is `Array<{ key: T[K], values: T[] }>`.
   *
   * For type-safe results, use {@link toGrouped} instead.
   *
   * @example
   * ```ts
   * // Option 1: Cast the result manually
   * const grouped = await query.groupBy('status').toArray();
   * const result = grouped as unknown as Array<{ key: string, values: User[] }>;
   *
   * // Option 2: Use type-safe toGrouped() method (recommended)
   * const result = await query.toGrouped('status');
   * ```
   */
  groupBy<K extends keyof T>(field: K): this {
    return this.pushOp((data) => group(data, (item) => item[field] as any) as unknown as T[], 'groupBy', [field]);
  }

  /**
   * Type-safe alternative to `groupBy().toArray()`.
   *
   * @param field - The field to group by
   * @returns Promise resolving to grouped results with correct typing
   *
   * @example
   * ```ts
   * const grouped = await query.toGrouped('status');
   * // Type: Array<{ key: string, values: User[] }>
   * ```
   */
  async toGrouped<K extends keyof T>(field: K): Promise<Array<{ key: T[K]; values: T[] }>> {
    const data = await this.executeOperations();
    const grouped = group(data, (item) => item[field] as any);
    // group() returns an object, we need to convert to array format
    return Object.entries(grouped).map(([key, values]) => ({
      key: key as T[K],
      values: values as T[],
    }));
  }

  search(query: string, tone?: number): this {
    return this.pushOp((data) => search(data as unknown as any[], query, tone) as unknown as T[]);
  }

  /** ---- Execution / state ---- */

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
    let data = originalData.slice(); // Create a shallow copy

    for (const { op } of this.operations) {
      data = op(data);
    }

    return data;
  }

  /** ---- Query builder DSL (typed) ---- */

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

/** -------------------- Schema Validation -------------------- **/

/**
 * Validates that the schema has a proper structure with key fields
 * Throws clear error early if the schema is malformed
 */
function validateDepositSchema<S extends DepositDataSchema>(schema: S): void {
  for (const [tableName, def] of Object.entries(schema)) {
    const recordDef = def as DepotDataRecord<any>;
    if (!recordDef || recordDef.key === undefined) {
      throw new Error(
        'Invalid schema: table "' +
          tableName +
          '" missing required "key" field. ' +
          'Schema entries must have shape: { key: K, record: T, indexes?: K[] }',
      );
    }
  }
}

/** -------------------- LocalStorageAdapter -------------------- **/

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

  /** ---- Public API Methods ---- */

  bulkDelete = runSafe(async <K extends keyof S>(table: K, keys: KeyType<S, K>[]) => {
    const promises = keys.map((key) => this.delete(table, key));
    await Promise.all(promises);
  }, 'BULK_DELETE_FAILED');

  bulkPut = runSafe(async <K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number) => {
    const promises = values.map((v) => this.put(table, v, ttl));
    await Promise.all(promises);
  }, 'BULK_PUT_FAILED');

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

  /** ---- Private Helper Methods ---- */

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
          // Log but don't throw - this is fire-and-forget cleanup
          Logit.setPrefix('Deposit');
          Logit.warn(`Failed to delete expired entry: ${storageKey}`, err);
        }
      });
    } catch (err) {
      // Corrupted JSON - silently skip and delete instead of throwing
      // This prevents one corrupted entry from breaking the entire getAll batch
      try {
        const idPart = this.extractKeyFromStorageKey(storageKey);
        await this.delete(table, idPart as KeyType<S, typeof table>);
      } catch (deleteErr) {
        // Even if delete fails, don't throw - just log
        Logit.setPrefix('Deposit');
        Logit.warn(`Failed to delete corrupted entry: ${storageKey}`, deleteErr);
      }

      // Log the corruption but return undefined to skip this entry
      Logit.setPrefix('Deposit');
      Logit.warn(`Skipping corrupted entry: ${storageKey}`, err);
      return undefined;
    }
  }

  private extractKeyFromStorageKey(storageKey: string): string {
    // Extract key from encoded storage key format: encodedDbName:version:encodedTable:encodedKey
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
    // Use encodeURIComponent to safely handle special characters including ':'
    const prefix = `${encodeURIComponent(this.dbName)}:${this.version}:${encodeURIComponent(String(table))}:`;
    return key === undefined || key === '' ? prefix : prefix + encodeURIComponent(String(key));
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
    validateDepositSchema(schema);
    this.dbName = dbName;
    this.version = version;
    this.schema = schema;
    this.migrationFn = migrationFn;
  }

  /** ---- Public API Methods ---- */

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

  bulkDelete = runSafe(async <K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      const promises = keys.map((key) => this.requestToPromise(store.delete(key as IDBKeyRange)));
      await Promise.all(promises);
    });
  }, 'BULK_DELETE_FAILED');

  bulkPut = runSafe(async <K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      const promises = values.map((value) => this.requestToPromise(store.put(wrapWithExpiry(value, ttl))));
      await Promise.all(promises);
    });
  }, 'BULK_PUT_FAILED');

  clear = runSafe(async <K extends keyof S>(table: K): Promise<void> => {
    await this.withTransaction(table, 'readwrite', async (store) => {
      await this.requestToPromise(store.clear());
    });
  }, 'CLEAR_FAILED');

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

  /** ---- Private Helper Methods ---- */

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: necessary for schema validation and error handling
  private createObjectStores(db: IDBDatabase): void {
    for (const [name, def] of Object.entries(this.schema)) {
      if (db.objectStoreNames.contains(name)) continue;

      const recordDef = def as DepotDataRecord<any>;
      const keyPath = recordDef.key as string;
      const store = db.createObjectStore(name, { keyPath });

      const indexes = recordDef.indexes;
      if (indexes && Array.isArray(indexes)) {
        // Track created indexes to avoid duplicates
        const createdIndexes = new Set<string>();

        for (const index of indexes) {
          const indexName = index as string;

          // Skip if already created (duplicate in schema)
          if (createdIndexes.has(indexName)) {
            Logit.setPrefix('Deposit');
            Logit.warn(`Duplicate index "${indexName}" in table "${name}" schema - skipping`);
            continue;
          }

          // Skip if trying to index the key path (redundant)
          if (indexName === keyPath) {
            Logit.setPrefix('Deposit');
            Logit.warn(`Skipping index on key path "${indexName}" in table "${name}" - redundant`);
            continue;
          }

          try {
            // Create index with default options (non-unique, no multiEntry)
            // For custom options, users should use migrationFn
            store.createIndex(indexName, indexName);
            createdIndexes.add(indexName);
          } catch (err) {
            Logit.setPrefix('Deposit');
            Logit.error(`Failed to create index "${indexName}" in table "${name}"`, err);
            // Continue creating other indexes
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

  /**
   * Executes a function within a transaction context
   *
   * Important notes:
   * - The fn callback must use the provided store parameter for all operations
   * - The fn's async operations must complete before the transaction auto-commits
   * - If fn throws or rejects, the transaction is aborted
   * - The result is only returned after transaction.oncomplete fires
   * - Don't rely on fn's return value being immediately available - wait for tx.oncomplete
   *
   * @param tables - Table name(s) to access
   * @param mode - Transaction mode ('readonly' | 'readwrite')
   * @param fn - Function that receives the object store and performs operations
   * @returns Promise that resolves with fn's result after transaction completes
   */
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

      // Execute the callback function
      fn(store)
        .then((r) => {
          result = r;
        })
        .catch((err) => {
          callbackError = err;
          this.abortTransaction(tx);
        });

      // Transaction completes successfully - return the result from fn
      tx.oncomplete = () => {
        if (callbackError) {
          reject(new Error(`Transaction callback failed for ${tablesStr}`, { cause: callbackError }));
        } else {
          resolve(result as T);
        }
      };

      // Transaction encountered an error
      tx.onerror = () => reject(new Error(`Transaction error for ${tablesStr}`, { cause: tx.error }));

      // Transaction was aborted (either by callback error or external abort)
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

/**
 * Wraps a value with an expiry timestamp if TTL is provided.
 */
function wrapWithExpiry<T extends Record<string, unknown>>(value: T, ttl?: number): T & { expiresAt?: number } {
  if (ttl === undefined) return value;
  return { ...value, expiresAt: Date.now() + ttl };
}

/**
 * Unwraps a value from an expiry wrapper, returns undefined if expired.
 * If expired, calls onExpire callback synchronously (fire-and-forget for async cleanup).
 */
function unwrapWithExpiry<T extends Record<string, unknown>>(
  value: T & { expiresAt?: number },
  now: number,
  onExpire?: () => void | Promise<void>,
): T | undefined {
  if (value.expiresAt === undefined) return value;

  if (now >= value.expiresAt) {
    // Fire-and-forget cleanup - don't block on async deletion
    if (onExpire) {
      const result = onExpire();
      // If it's a promise, catch errors to prevent unhandled rejections
      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>).catch((err) => {
          Logit.setPrefix('Deposit');
          Logit.warn('Failed to clean up expired entry', err);
        });
      }
    }
    return undefined;
  }

  return value;
}

/** -------------------- runSafe -------------------- **/

/**
 * Wraps a function to suppress errors and log them with a consistent prefix.
 * For async functions, catches both sync and async errors.
 */
export function runSafe<T extends (...args: any[]) => any>(fn: T, label = 'OPERATION_FAILED'): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);

      // Handle async functions
      if (result && typeof result.then === 'function') {
        return result.catch((err: Error) => {
          Logit.setPrefix('Deposit');
          Logit.error(label, err);
          return undefined;
        });
      }

      return result;
    } catch (err) {
      Logit.setPrefix('Deposit');
      Logit.error(label, err);
      return undefined;
    }
  }) as unknown as T;
}
