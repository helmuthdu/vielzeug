import type { QueryBuilder } from './query';

/* -------------------- Core Types -------------------- */

/**
 * The definition for a single table within a schema.
 */
export type SchemaEntry<T extends Record<string, unknown>> = {
  key: keyof T & string;
};

declare const ttlMsBrand: unique symbol;

export type TtlMs = number & { readonly [ttlMsBrand]: 'TtlMs' };

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
export type RecordOf<S extends AnySchema, K extends keyof S> = S[K] extends SchemaEntry<infer R> ? R : never;

/** Extract the key type for a given table from a schema. */
export type KeyOf<S extends AnySchema, K extends keyof S> =
  S[K] extends SchemaEntry<infer R> ? (S[K]['key'] extends keyof R ? R[S[K]['key']] : never) : never;

/**
 * Creates a typed `SchemaEntry` for use in a schema definition.
 *
 * Each schema entry maps a table name to its record type and primary key field.
 *
 * @example
 * ```ts
 * const schema = {
 *   users: table<User>('id'),
 *   posts: table<Post>('id'),
 * };
 * ```
 */
export function table<T extends Record<string, unknown>>(key: keyof T & string): SchemaEntry<T> {
  return { key };
}

/* -------------------- Transaction context for IndexedDB -------------------- */

type ScopedTableOps<S extends AnySchema, K extends keyof S> = {
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  deleteAll<T extends K>(table: T): Promise<number>;
  deleteWhere<T extends K>(table: T, predicate: (record: RecordOf<S, T>) => boolean): Promise<number>;
  forEach<T extends K>(table: T, fn: (record: RecordOf<S, T>) => void | Promise<void>): Promise<void>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  getOrPut<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<RecordOf<S, T>>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  iterate<T extends K>(table: T): AsyncIterable<RecordOf<S, T>>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: TtlMs): Promise<void>;
  query<T extends K>(table: T): QueryBuilder<RecordOf<S, T>>;
  update<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    changes: Partial<RecordOf<S, T>>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, T> | undefined>;
};

/**
 * A subset of `Adapter` scoped to a single IDB transaction.
 * The transaction commits atomically when the async callback resolves, or rolls back if it throws.
 */
export type TransactionContext<S extends AnySchema, K extends keyof S> = ScopedTableOps<S, K>;

/* -------------------- Adapter Interface -------------------- */

export interface Adapter<S extends AnySchema> extends ScopedTableOps<S, keyof S> {
  /** Disposes adapter resources such as observers and cross-tab channels. */
  dispose(): void;
  observe<K extends keyof S>(
    table: K,
    listener: Observer<RecordOf<S, K>>,
    options?: { immediate?: boolean },
  ): () => void;
}

export interface IndexedDBHandle<S extends AnySchema> extends Adapter<S> {
  transaction<K extends keyof S, R>(tables: readonly K[], fn: (tx: TransactionContext<S, K>) => Promise<R>): Promise<R>;
}
