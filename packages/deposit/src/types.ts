import type { QueryBuilder } from './query';

/* -------------------- Core Types -------------------- */

/**
 * The definition for a single table within a schema.
 * The `_type` phantom property carries the record type through the type system; it is never
 * present at runtime.
 */
export type SchemaEntry<T extends Record<string, unknown>> = {
  /** @internal Phantom — carries the record type. Not present at runtime. */
  readonly _type?: T;
  key: keyof T & string;
};

export type Schema<S extends Record<string, Record<string, unknown>>> = {
  [K in keyof S]: SchemaEntry<S[K]>;
};

export type MigrationContext = {
  db: IDBDatabase;
  newVersion: number | null;
  oldVersion: number;
  tx: IDBTransaction;
};

export type MigrationFn = (ctx: MigrationContext) => void;

// NonNullable strips the `| undefined` introduced by the optional phantom property (`?`).
// Intersecting with Record<string, unknown> satisfies the constraint required by QueryBuilder<T>.
export type RecordType<S extends Schema<any>, K extends keyof S> = NonNullable<S[K]['_type']> & Record<string, unknown>;

// Extracts the value-type of the key field using the phantom record type.
export type KeyType<S extends Schema<any>, K extends keyof S> =
  S[K] extends SchemaEntry<infer R> ? (S[K]['key'] extends keyof R ? R[S[K]['key']] : never) : never;

/** Extract the record type for a given table from a schema. */
export type RecordOf<S extends Schema<any>, K extends keyof S> = NonNullable<S[K]['_type']>;

/** Extract the key type for a given table from a schema. */
export type KeyOf<S extends Schema<any>, K extends keyof S> = KeyType<S, K>;

export type LocalStorageOptions<S extends Schema<any>> = {
  dbName: string;
  schema: S;
};

export type IndexedDBOptions<S extends Schema<any>> = {
  dbName: string;
  migrationFn?: MigrationFn;
  schema: S;
  /** Increment to trigger `migrationFn` on next open. */
  version: number;
};

/* -------------------- Transaction context for IndexedDB -------------------- */

/**
 * A subset of `Adapter` scoped to a single IDB transaction.
 * The transaction commits atomically when the async callback resolves, or rolls back if it throws.
 *
 * Note: `count()` is TTL-accurate and equivalent to `(await tx.getAll(table)).length`.
 */
export type TransactionContext<S extends Schema<any>, K extends keyof S> = {
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyType<S, T>): Promise<void>;
  deleteAll<T extends K>(table: T): Promise<void>;
  from<T extends K>(table: T): QueryBuilder<RecordType<S, T>>;
  get<T extends K>(table: T, key: KeyType<S, T>): Promise<RecordType<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordType<S, T>[]>;
  put<T extends K>(table: T, value: RecordType<S, T>, ttl?: number): Promise<void>;
};

/* -------------------- Adapter Interface -------------------- */

export interface Adapter<S extends Schema<any>> {
  count<K extends keyof S>(table: K): Promise<number>;
  delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void>;
  deleteAll<K extends keyof S>(table: K): Promise<void>;
  from<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>>;
  get<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<RecordType<S, K> | undefined>;
  getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]>;
  put<K extends keyof S>(table: K, value: RecordType<S, K>, ttl?: number): Promise<void>;
}

export interface IndexedDBHandle<S extends Schema<any>> extends Adapter<S> {
  transaction<K extends keyof S>(tables: K[], fn: (tx: TransactionContext<S, K>) => Promise<void>): Promise<void>;
  close(): void;
}
