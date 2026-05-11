import type { QueryBuilder } from './query';

/* -------------------- Core Types -------------------- */

/**
 * The definition for a single table within a schema.
 */
export type SchemaEntry<T extends Record<string, unknown>> = {
  key: keyof T & string;
};

export type Schema<S extends Record<string, Record<string, unknown>>> = {
  [K in keyof S]: SchemaEntry<S[K]>;
};

export type AnySchema = Record<string, { key: string }>;

export type MigrationContext = {
  db: IDBDatabase;
  newVersion: number | null;
  oldVersion: number;
  tx: IDBTransaction;
};

export type MigrationFn = (ctx: MigrationContext) => void;
export type Observer<T> = (records: T[]) => void;

/** Extract the record type for a given table from a schema. */
export type RecordOf<S extends Schema<any>, K extends keyof S> = S[K] extends SchemaEntry<infer R> ? R : never;

/** Extract the key type for a given table from a schema. */
export type KeyOf<S extends Schema<any>, K extends keyof S> =
  S[K] extends SchemaEntry<infer R> ? (S[K]['key'] extends keyof R ? R[S[K]['key']] : never) : never;

type KeyFieldOf<T extends Record<string, unknown>> = {
  [K in keyof T & string]-?: T[K] extends string | number ? K : never;
}[keyof T & string];

/**
 * Creates a typed `SchemaEntry` for use in a schema definition.
 * @example
 * ```ts
 * const schema = {
 *   users: table<User>('id'),
 *   posts: table<Post>('id'),
 * };
 * ```
 */
export function table<T extends Record<string, unknown>>(key: KeyFieldOf<T>): SchemaEntry<T> {
  return { key: key as keyof T & string };
}

/* -------------------- Transaction context for IndexedDB -------------------- */

/**
 * A subset of `Adapter` scoped to a single IDB transaction.
 * The transaction commits atomically when the async callback resolves, or rolls back if it throws.
 *
 * Note: `count()` is TTL-accurate and equivalent to `(await tx.getAll(table)).length`.
 */
export type TransactionContext<S extends Schema<any>, K extends keyof S> = {
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<void>;
  deleteAll<T extends K>(table: T): Promise<void>;
  deleteWhere<T extends K>(table: T, predicate: (record: RecordOf<S, T>) => boolean): Promise<number>;
  forEach<T extends K>(table: T, fn: (record: RecordOf<S, T>, index: number) => void | Promise<void>): Promise<void>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  getOrPut<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    fallback: RecordOf<S, T> | (() => RecordOf<S, T>),
    ttl?: number,
  ): Promise<RecordOf<S, T>>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: number): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: number): Promise<void>;
  query<T extends K>(table: T): QueryBuilder<RecordOf<S, T>>;
  update<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    changes: Partial<RecordOf<S, T>>,
    ttl?: number,
  ): Promise<RecordOf<S, T> | undefined>;
};

/* -------------------- Adapter Interface -------------------- */

export interface Adapter<S extends Schema<any>> {
  /** Returns the number of live (non-TTL-expired) records in the table. Performs a full scan. */
  count<K extends keyof S>(table: K): Promise<number>;
  delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void>;
  deleteAll<K extends keyof S>(table: K): Promise<void>;
  deleteWhere<K extends keyof S>(table: K, predicate: (record: RecordOf<S, K>) => boolean): Promise<number>;
  forEach<K extends keyof S>(
    table: K,
    fn: (record: RecordOf<S, K>, index: number) => void | Promise<void>,
  ): Promise<void>;
  get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]>;
  getOrPut<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    fallback: RecordOf<S, K> | (() => RecordOf<S, K>),
    ttl?: number,
  ): Promise<RecordOf<S, K>>;
  has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  observe<K extends keyof S>(table: K, listener: Observer<RecordOf<S, K>>): () => void;
  put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void>;
  putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: number): Promise<void>;
  query<K extends keyof S>(table: K): QueryBuilder<RecordOf<S, K>>;
  update<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    changes: Partial<RecordOf<S, K>>,
    ttl?: number,
  ): Promise<RecordOf<S, K> | undefined>;
}

export interface IndexedDBHandle<S extends Schema<any>> extends Adapter<S> {
  transaction<K extends keyof S, R>(tables: readonly K[], fn: (tx: TransactionContext<S, K>) => Promise<R>): Promise<R>;
  close(): void;
}
