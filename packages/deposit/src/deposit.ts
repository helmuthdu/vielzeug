/* ============================================
   deposit - Lightweight client-side data storage
   ============================================ */

import { type Predicate, search, sort } from '@vielzeug/toolkit';

/* -------------------- Core Types -------------------- */

type Logger = {
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
};

/** @internal Phantom symbol — carries the original record type through the Schema wrapper. Not present at runtime. */
declare const _r: unique symbol;

export type Schema<S = Record<string, Record<string, unknown>>> = {
  [K in keyof S]: {
    key: keyof S[K] & string;
    indexes?: (keyof S[K] & string)[];
    /** @internal */
    readonly [_r]?: S[K];
  };
};

export type MigrationFn = (
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBTransaction,
) => void | Promise<void>;

// NonNullable strips the `| undefined` introduced by the optional phantom property (`?`).
// Intersecting with Record<string, unknown> satisfies the constraint required by QueryBuilder<T>.
type RecordType<S extends Schema, K extends keyof S> = NonNullable<S[K][typeof _r]> & Record<string, unknown>;

// Extracts the value-type of the key field using the phantom record type.
type KeyType<S extends Schema, K extends keyof S> = S[K] extends {
  key: infer KF;
  [_r]?: infer R;
}
  ? KF extends keyof NonNullable<R>
    ? NonNullable<R>[KF & keyof NonNullable<R>]
    : never
  : never;

export type LocalStorageOptions<S extends Record<string, Record<string, unknown>>> = {
  dbName: string;
  schema: Schema<S>;
  logger?: Logger;
};

export type IndexedDBOptions<S extends Record<string, Record<string, unknown>>> = {
  dbName: string;
  version?: number;
  schema: Schema<S>;
  migrationFn?: MigrationFn;
  logger?: Logger;
};

/* -------------------- Transaction context for IndexedDB -------------------- */

/**
 * A subset of `Adapter` scoped to a single IDB transaction.
 * The transaction commits atomically when the async callback resolves, or rolls back if it throws.
 *
 * Methods intentionally absent (not supported within IDB transactions):
 * `getMany`, `count`, `has`, `getOrPut`, `from`.
 */
export type TransactionContext<S extends Schema, K extends keyof S> = {
  get<T extends K>(table: T, key: KeyType<S, T>): Promise<RecordType<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordType<S, T>[]>;
  put<T extends K>(table: T, value: RecordType<S, T>, ttl?: number): Promise<void>;
  delete<T extends K>(table: T, key: KeyType<S, T>): Promise<void>;
  patch<T extends K>(
    table: T,
    key: KeyType<S, T>,
    partial: Partial<RecordType<S, T>>,
  ): Promise<RecordType<S, T> | undefined>;
};

/* -------------------- Adapter Interface -------------------- */

export interface Adapter<S extends Schema> {
  get<K extends keyof S>(table: K, key: KeyType<S, K>, defaultValue: RecordType<S, K>): Promise<RecordType<S, K>>;
  get<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: RecordType<S, K>,
  ): Promise<RecordType<S, K> | undefined>;
  getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]>;
  getMany<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<RecordType<S, K>[]>;
  put<K extends keyof S>(table: K, value: RecordType<S, K> | RecordType<S, K>[], ttl?: number): Promise<void>;
  delete<K extends keyof S>(table: K, key: KeyType<S, K> | KeyType<S, K>[]): Promise<void>;
  patch<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    partial: Partial<RecordType<S, K>>,
  ): Promise<RecordType<S, K> | undefined>;
  deleteAll<K extends keyof S>(table: K): Promise<void>;
  count<K extends keyof S>(table: K): Promise<number>;
  has<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<boolean>;
  getOrPut<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    factory: () => RecordType<S, K> | Promise<RecordType<S, K>>,
    ttl?: number,
  ): Promise<RecordType<S, K>>;
  from<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>>;
}

export interface IndexedDBHandle<S extends Schema> extends Adapter<S> {
  transaction<K extends keyof S>(tables: K[], fn: (tx: TransactionContext<S, K>) => Promise<void>): Promise<void>;
  close(): void;
}

/* -------------------- Schema Factory -------------------- */

/**
 * Helper to create a type-safe schema definition with clean syntax.
 * @example
 * ```ts
 * const schema = defineSchema<{ users: User; posts: Post }>({
 *   users: { key: 'id', indexes: ['name', 'email'] },
 *   posts: { key: 'id' }
 * });
 * ```
 */
export function defineSchema<S extends Record<string, Record<string, unknown>>>(schema: {
  [K in keyof S]: { key: keyof S[K] & string; indexes?: (keyof S[K] & string)[] };
}): Schema<S> {
  return schema as unknown as Schema<S>;
}

/* -------------------- Adapter Factories -------------------- */

export function createLocalStorage<S extends Record<string, Record<string, unknown>>>(
  options: LocalStorageOptions<S>,
): Adapter<Schema<S>> {
  return new LocalStorageAdapter(options.dbName, options.schema, options.logger);
}

export function createIndexedDB<S extends Record<string, Record<string, unknown>>>(
  options: IndexedDBOptions<S>,
): IndexedDBHandle<Schema<S>> {
  return new IndexedDBAdapter(
    options.dbName,
    options.version ?? 1,
    options.schema,
    options.migrationFn,
    options.logger,
  );
}

/**
 * Returns the IDB key path for a given field name, accounting for the internal
 * envelope format used by deposit (`{ v: record, exp?: number }`).
 *
 * Use this in `migrationFn` when creating indexes or accessing object-store key paths,
 * so your migration code stays decoupled from deposit's storage internals.
 *
 * @example
 * ```ts
 * const migrationFn: MigrationFn = (db, oldVersion, _newVersion, tx) => {
 *   if (oldVersion < 2) {
 *     tx.objectStore('users').createIndex('email', storeField('email'), { unique: true });
 *   }
 * };
 * ```
 */
export function storeField(field: string): string {
  return `v.${field}`;
}

/* -------------------- TTL Envelope (storage-layer only) -------------------- */

type Envelope<T> = { v: T; exp?: number };

function wrap<T>(value: T, ttl?: number): Envelope<T> {
  return ttl ? { exp: Date.now() + ttl, v: value } : { v: value };
}

function unwrap<T>(env: Envelope<T>): T | undefined {
  return env.exp !== undefined && Date.now() >= env.exp ? undefined : env.v;
}

function isEnvelope(value: unknown): value is Envelope<unknown> {
  return typeof value === 'object' && value !== null && 'v' in value;
}

/* -------------------- ProjectedQuery -------------------- */

/**
 * Terminal result of a `QueryBuilder.map()` projection.
 * Supports the same terminal methods as `QueryBuilder` but is not further chainable,
 * since the record type may no longer be an object (e.g. `map(u => u.name)` yields `string`).
 */
export class ProjectedQuery<U> {
  private readonly source: () => Promise<U[]>;

  constructor(source: () => Promise<U[]>) {
    this.source = source;
  }

  async toArray(): Promise<U[]> {
    return this.source();
  }

  async first(): Promise<U | undefined> {
    return (await this.source())[0];
  }

  async last(): Promise<U | undefined> {
    const arr = await this.source();
    return arr[arr.length - 1];
  }

  /** Returns the number of projected records. */
  async count(): Promise<number> {
    return (await this.source()).length;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<U> {
    for (const item of await this.source()) yield item;
  }
}

/* -------------------- QueryBuilder -------------------- */

export class QueryBuilder<T extends Record<string, unknown>> {
  private readonly operations: ReadonlyArray<(data: unknown[]) => unknown[]>;
  private readonly adapter: { getAll(table: string): Promise<unknown[]> };
  private readonly table: string;

  constructor(
    adapter: { getAll(table: string): Promise<unknown[]> },
    table: string,
    operations: ReadonlyArray<(data: unknown[]) => unknown[]> = [],
  ) {
    this.adapter = adapter;
    this.table = table;
    this.operations = operations;
  }

  private clone(op: (data: T[]) => T[]): QueryBuilder<T> {
    return new QueryBuilder<T>(this.adapter, this.table, [...this.operations, op as (data: unknown[]) => unknown[]]);
  }

  equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T> {
    return this.clone((data) => data.filter((r) => r[field] === value));
  }

  between<K extends keyof T>(
    field: K,
    lower: T[K] extends number | string ? T[K] : never,
    upper: T[K] extends number | string ? T[K] : never,
  ): QueryBuilder<T> {
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

  and(...predicates: Predicate<T>[]): QueryBuilder<T> {
    return this.clone((data) => data.filter((r, i, a) => predicates.every((p) => p(r, i, a))));
  }

  or(...predicates: Predicate<T>[]): QueryBuilder<T> {
    return this.clone((data) => data.filter((r, i, a) => predicates.some((p) => p(r, i, a))));
  }

  orderBy<K extends keyof T>(field: K, direction: 'asc' | 'desc' = 'asc'): QueryBuilder<T> {
    return this.clone((data) => sort(data, { [field]: direction } as Partial<Record<keyof T, 'asc' | 'desc'>>) as T[]);
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

  /**
   * Projects each record to a new value.
   * Returns a `ProjectedQuery<U>` rather than a `QueryBuilder`, since the result
   * type may not be a plain object (e.g. `map(u => u.name)` yields `string`).
   */
  map<U>(callback: (record: T) => U): ProjectedQuery<U> {
    const ops = [...this.operations, (data: unknown[]) => (data as T[]).map(callback)];
    return new ProjectedQuery<U>(async () => {
      let data: unknown[] = await this.adapter.getAll(this.table);
      for (const op of ops) data = op(data);
      return data as U[];
    });
  }

  /**
   * Fuzzy full-text search across all string fields.
   * @param query The search string.
   * @param tone  Match threshold in [0, 1]. Lower = more permissive. Defaults to 0.25.
   */
  search(query: string, tone?: number): QueryBuilder<T> {
    return this.clone((data) => search(data, query, tone) as T[]);
  }

  contains(query: string, fields?: (keyof T & string)[]): QueryBuilder<T> {
    const lq = query.toLowerCase();
    return this.clone((data) =>
      data.filter((r) => {
        const keys = fields ?? (Object.keys(r) as (keyof T & string)[]);
        return keys.some((f) => typeof r[f] === 'string' && (r[f] as string).toLowerCase().includes(lq));
      }),
    );
  }

  /**
   * Returns the number of records after all pipeline operations are applied.
   * Note: `limit`, `offset`, and `page` affect this count — use them after calling `count()`
   * if you need a total match count independent of pagination.
   */
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
    let data: unknown[] = await this.adapter.getAll(this.table);
    for (const op of this.operations) data = op(data);
    return data as T[];
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    for (const item of await this.toArray()) yield item;
  }
}

/* -------------------- LocalStorageAdapter -------------------- */

class LocalStorageAdapter<S extends Schema> implements Adapter<S> {
  private readonly schema: S;
  private readonly logger: Logger;
  private readonly prefixCache: Map<string, string>;
  private readonly dbName: string;

  constructor(dbName: string, schema: S, logger?: Logger) {
    this.dbName = dbName;
    this.schema = schema;
    this.logger = logger ?? console;
    this.prefixCache = new Map();

    for (const [table, def] of Object.entries(schema)) {
      if ((def as { indexes?: unknown[] }).indexes?.length) {
        this.logger.warn(`deposit: indexes declared for table "${table}" are ignored by the localStorage adapter`);
      }
    }
  }

  private checkStorage(): void {
    try {
      // accessing localStorage throws a SecurityError in Safari private mode and some sandboxed iframes
      // biome-ignore lint/suspicious/noSelfCompare: intentional availability probe
      void localStorage;
    } catch {
      throw new Error(
        'deposit: localStorage is not available in this environment (private browsing or sandboxed iframe?)',
      );
    }
  }

  from<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>> {
    return new QueryBuilder<RecordType<S, K>>(this, String(table));
  }

  get<K extends keyof S>(table: K, key: KeyType<S, K>, defaultValue: RecordType<S, K>): Promise<RecordType<S, K>>;
  get<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: RecordType<S, K>,
  ): Promise<RecordType<S, K> | undefined>;
  async get<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: RecordType<S, K>,
  ): Promise<RecordType<S, K> | undefined> {
    this.checkStorage();
    return this.readEntry<RecordType<S, K>>(this.storageKey(table, String(key)), String(key)) ?? defaultValue;
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]> {
    this.checkStorage();
    const prefix = this.tablePrefix(table);
    const records: RecordType<S, K>[] = [];
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(prefix)) continue;
      const value = this.readEntry<RecordType<S, K>>(k);
      if (value !== undefined) records.push(value);
    }
    return records;
  }

  async getMany<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<RecordType<S, K>[]> {
    const results: RecordType<S, K>[] = [];
    for (const k of keys) {
      const value = this.readEntry<RecordType<S, K>>(this.storageKey(table, String(k)));
      if (value !== undefined) results.push(value);
    }
    return results;
  }

  async put<K extends keyof S>(table: K, value: RecordType<S, K> | RecordType<S, K>[], ttl?: number): Promise<void> {
    this.checkStorage();
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      const key = this.recordKey(v, table);
      localStorage.setItem(this.storageKey(table, String(key)), JSON.stringify(wrap(v, ttl)));
    }
  }

  async delete<K extends keyof S>(table: K, key: KeyType<S, K> | KeyType<S, K>[]): Promise<void> {
    this.checkStorage();
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) {
      localStorage.removeItem(this.storageKey(table, String(k)));
    }
  }

  async patch<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    partial: Partial<RecordType<S, K>>,
  ): Promise<RecordType<S, K> | undefined> {
    const storageKey = this.storageKey(table, String(key));
    const raw = localStorage.getItem(storageKey);
    if (!raw) return undefined;
    try {
      const env = JSON.parse(raw) as Envelope<RecordType<S, K>>;
      if (!isEnvelope(env)) {
        localStorage.removeItem(storageKey);
        return undefined;
      }
      const current = unwrap(env);
      if (current === undefined) {
        localStorage.removeItem(storageKey);
        return undefined;
      }
      const merged = { ...current, ...partial } as RecordType<S, K>;
      localStorage.setItem(storageKey, JSON.stringify({ ...env, v: merged }));
      return merged;
    } catch {
      localStorage.removeItem(storageKey);
      return undefined;
    }
  }

  async getOrPut<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    factory: () => RecordType<S, K> | Promise<RecordType<S, K>>,
    ttl?: number,
  ): Promise<RecordType<S, K>> {
    const existing = await this.get(table, key);
    if (existing !== undefined) return existing;
    const value = await factory();
    await this.put(table, value, ttl);
    return value;
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    this.checkStorage();
    const prefix = this.tablePrefix(table);
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(prefix)) localStorage.removeItem(k);
    }
  }

  /**
   * Returns the number of live (non-expired) records in the given table.
   * Note: scans all matching keys to exclude TTL-expired entries — O(n).
   */
  async count<K extends keyof S>(table: K): Promise<number> {
    this.checkStorage();
    const prefix = this.tablePrefix(table);
    let n = 0;
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(prefix) && this.readEntry(k) !== undefined) n++;
    }
    return n;
  }

  async has<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<boolean> {
    return (await this.get(table, key)) !== undefined;
  }

  private readEntry<T>(storageKey: string, keyHint?: string): T | undefined {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return undefined;
    try {
      const env = JSON.parse(raw) as Envelope<T>;
      if (!isEnvelope(env)) {
        localStorage.removeItem(storageKey);
        return undefined;
      }
      const value = unwrap(env);
      if (value === undefined) {
        localStorage.removeItem(storageKey);
        return undefined;
      }
      return value;
    } catch (err) {
      this.logger.warn(`Removing corrupted entry for key: ${keyHint ?? storageKey}`, err);
      localStorage.removeItem(storageKey);
      return undefined;
    }
  }

  private recordKey<K extends keyof S>(value: Record<string, unknown>, table: K): string | number {
    const keyField = String((this.schema[table] as { key: string }).key);
    const keyValue = value[keyField];
    if (keyValue === undefined || keyValue === null) {
      throw new Error(`Missing required key field "${keyField}" in record for table "${String(table)}"`);
    }
    return keyValue as string | number;
  }

  private tablePrefix<K extends keyof S>(table: K): string {
    const name = String(table);
    let prefix = this.prefixCache.get(name);
    if (!prefix) {
      prefix = `${encodeURIComponent(this.dbName)}:${encodeURIComponent(name)}:`;
      this.prefixCache.set(name, prefix);
    }
    return prefix;
  }

  private storageKey<K extends keyof S>(table: K, key: string): string {
    return this.tablePrefix(table) + encodeURIComponent(key);
  }
}

/* -------------------- IndexedDBAdapter -------------------- */

class IndexedDBAdapter<S extends Schema> implements IndexedDBHandle<S> {
  private db: IDBDatabase | null = null;
  private connectPromise: Promise<void> | null = null;
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
    this.db?.close();
    this.db = null;
    this.connectPromise = null;
  }

  private connect(): Promise<void> {
    this.connectPromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const tx = request.transaction!;
        this.createObjectStores(db, tx);

        if (this.migrationFn) {
          const handleError = (err: unknown) => {
            try {
              tx.abort();
            } catch {
              /* ignore */
            }
            reject(new Error(`deposit: migration failed for "${this.dbName}"`, { cause: err }));
          };
          try {
            const result = this.migrationFn(
              db,
              event.oldVersion,
              (event as IDBVersionChangeEvent).newVersion ?? null,
              tx,
            );
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

      request.onerror = () => {
        this.connectPromise = null;
        reject(new Error(`deposit: failed to open "${this.dbName}" (IndexedDB)`));
      };
    });
    return this.connectPromise;
  }

  get<K extends keyof S>(table: K, key: KeyType<S, K>, defaultValue: RecordType<S, K>): Promise<RecordType<S, K>>;
  get<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: RecordType<S, K>,
  ): Promise<RecordType<S, K> | undefined>;
  async get<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    defaultValue?: RecordType<S, K>,
  ): Promise<RecordType<S, K> | undefined> {
    return this.withStore(table, 'readonly', async (store) => {
      const env = await this.idbRequest<Envelope<RecordType<S, K>>>(store.get(key as IDBValidKey));
      if (!env || !isEnvelope(env)) return defaultValue;
      const value = unwrap(env);
      return value !== undefined ? value : defaultValue;
    });
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
        );
      }
      return records;
    });
  }

  async getMany<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<RecordType<S, K>[]> {
    return this.withStore(table, 'readonly', async (store) => {
      const envs = await Promise.all(
        keys.map((k) => this.idbRequest<Envelope<RecordType<S, K>>>(store.get(k as IDBValidKey))),
      );
      return envs
        .map((env) => (env && isEnvelope(env) ? unwrap(env) : undefined))
        .filter((v): v is RecordType<S, K> => v !== undefined);
    });
  }

  async put<K extends keyof S>(table: K, value: RecordType<S, K> | RecordType<S, K>[], ttl?: number): Promise<void> {
    const values = Array.isArray(value) ? value : [value];
    await this.withStore(table, 'readwrite', async (store) => {
      await Promise.all(values.map((v) => this.idbRequest(store.put(wrap(v, ttl)))));
    });
  }

  async delete<K extends keyof S>(table: K, key: KeyType<S, K> | KeyType<S, K>[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    await this.withStore(table, 'readwrite', async (store) => {
      await Promise.all(keys.map((k) => this.idbRequest(store.delete(k as IDBValidKey))));
    });
  }

  async patch<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    partial: Partial<RecordType<S, K>>,
  ): Promise<RecordType<S, K> | undefined> {
    return this.withStore(table, 'readwrite', async (store) => {
      const env = await this.idbRequest<Envelope<RecordType<S, K>>>(store.get(key as IDBValidKey));
      if (!env || !isEnvelope(env)) return undefined;
      const current = unwrap(env);
      if (current === undefined) return undefined;
      const merged = { ...current, ...partial } as RecordType<S, K>;
      await this.idbRequest(store.put({ ...env, v: merged }));
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
      const env = await this.idbRequest<Envelope<RecordType<S, K>>>(store.get(key as IDBValidKey));
      if (env && isEnvelope(env)) {
        const value = unwrap(env);
        if (value !== undefined) return value;
      }
      const value = await factory();
      await this.idbRequest(store.put(wrap(value, ttl)));
      return value;
    });
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    await this.withStore(table, 'readwrite', (store) => this.idbRequest<undefined>(store.clear()));
  }

  /**
   * Returns the number of live (non-expired) records in the given table.
   * Note: fetches all records to exclude TTL-expired entries — O(n).
   */
  async count<K extends keyof S>(table: K): Promise<number> {
    return this.withStore(table, 'readonly', async (store) => {
      const envs = await this.idbRequest<Envelope<RecordType<S, K>>[]>(store.getAll());
      return envs.filter((e) => isEnvelope(e) && unwrap(e) !== undefined).length;
    });
  }

  async has<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<boolean> {
    return (await this.get(table, key)) !== undefined;
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
        delete: (table, key) => this.idbRequest(idbTx.objectStore(String(table)).delete(key as IDBValidKey)),
        get: (table, key) =>
          this.idbRequest<Envelope<RecordType<S, K>>>(idbTx.objectStore(String(table)).get(key as IDBValidKey)).then(
            (env) => (env && isEnvelope(env) ? (unwrap(env) ?? undefined) : undefined),
          ),
        getAll: (table) =>
          this.idbRequest<Envelope<RecordType<S, K>>[]>(idbTx.objectStore(String(table)).getAll()).then((results) =>
            results
              .filter(isEnvelope)
              .map((env) => unwrap(env))
              .filter((v): v is RecordType<S, K> => v !== undefined),
          ),
        patch: (table, key, partial) =>
          this.idbRequest<Envelope<RecordType<S, K>>>(idbTx.objectStore(String(table)).get(key as IDBValidKey)).then(
            (env) => {
              if (!env || !isEnvelope(env)) return undefined;
              const current = unwrap(env);
              if (current === undefined) return undefined;
              const merged = { ...current, ...partial } as RecordType<S, K>;
              return this.idbRequest(idbTx.objectStore(String(table)).put({ ...env, v: merged })).then(() => merged);
            },
          ),
        put: (table, value, ttl) =>
          this.idbRequest(idbTx.objectStore(String(table)).put(wrap(value, ttl))).then(() => undefined),
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
