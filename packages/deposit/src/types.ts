import type { QueryBuilder } from './query';

import { assertTtlMs, type TtlMs } from './ttl';

/* -------------------- Re-export TtlMs for public API -------------------- */

export type { TtlMs };

/* -------------------- Schema types -------------------- */

/**
 * Schema entry for a single table.
 * `T` is the record type; `Key` is the primary key field name.
 *
 * `_record` is a phantom field that holds `T` in a directly inferable position so TypeScript
 * can recover `T` in `RecordOf` conditional types. It is never set at runtime.
 */
export type SchemaEntry<T extends Record<string, unknown>, Key extends keyof T & string = keyof T & string> = {
  /** @internal Phantom field — enables TypeScript to infer T. Never has a runtime value. */
  readonly _record?: T;
  defaultTtl?: TtlMs;
  key: Key;
};

/** A schema is any record of `SchemaEntry`-compatible values. Checked structurally so that
 *  concrete `SchemaEntry<T, Key>` values satisfy it without covariance constraints. */
export type AnySchema = Record<string, { defaultTtl?: TtlMs; key: string }>;

/** Fluent builder returned by `table()` — satisfies `SchemaEntry` and adds `.ttl()` chaining. */
type TableBuilder<T extends Record<string, unknown>, Key extends keyof T & string> = SchemaEntry<T, Key> & {
  /** Set a default TTL (ms) applied to all `put`/`putAll` calls that don't specify one explicitly. */
  ttl: (ms: TtlMs) => SchemaEntry<T, Key>;
};

export function table<T extends Record<string, unknown>, Key extends keyof T & string = keyof T & string>(
  key: Key,
): TableBuilder<T, Key> {
  return {
    key,
    ttl: (ms: TtlMs): SchemaEntry<T, Key> => {
      assertTtlMs(ms, 'table.ttl');

      return { defaultTtl: ms, key };
    },
  };
}

/** Extracts the record type from a schema table entry. */
export type RecordOf<S extends AnySchema, K extends keyof S> =
  S[K] extends SchemaEntry<infer R, infer _Key> ? R : never;

/** Extracts the primary key value type from a schema table entry. */
export type KeyOf<S extends AnySchema, K extends keyof S> =
  S[K] extends SchemaEntry<infer R, infer Key> ? R[Key] : never;

/* -------------------- Migration -------------------- */

export type MigrationContext = {
  db: IDBDatabase;
  newVersion: number | null;
  oldVersion: number;
  tx: IDBTransaction;
};

export type MigrationFn = (ctx: MigrationContext) => void;

/* -------------------- Observer -------------------- */

export type Observer<T> = (records: T[]) => void;

/* -------------------- Metrics -------------------- */

export type MetricsEvent = {
  duration: number;
  operation:
    | 'batch'
    | 'count'
    | 'delete'
    | 'clear'
    | 'get'
    | 'getAll'
    | 'has'
    | 'iterate'
    | 'put'
    | 'putAll'
    | 'query'
    | 'queryDelete'
    | 'update'
    | 'upsert';
  table: string;
};

/* -------------------- Debug info -------------------- */

export type DebugStats = {
  /** Number of TTL-expired records still physically in the store (not yet lazily evicted). */
  expiredCount: number;
  /** Number of live (non-expired) records. */
  recordCount: number;
};

export type DebugInfo<S extends AnySchema> = {
  tables: Array<{ name: keyof S & string } & DebugStats>;
};

/* -------------------- Transaction context -------------------- */

/** Available inside `batch()` callbacks. For IndexedDB, operations run in a real atomic IDB transaction. */
export type TransactionContext<S extends AnySchema, K extends keyof S = keyof S> = {
  clear<T extends K>(table: T): Promise<void>;
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
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
  upsert<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    fn: (existing: RecordOf<S, T> | undefined) => RecordOf<S, T>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, T>>;
};

/* -------------------- Adapter interface -------------------- */

export interface Adapter<S extends AnySchema> {
  /**
   * Execute multiple operations against a set of tables with deferred observer notifications.
   *
   * All observer callbacks fire once per dirty table after `fn` resolves, instead of after
   * each individual write. Inside `fn`, only the tables declared in `tables` may be accessed.
   * For the IndexedDB adapter this is also a true atomic IDB transaction.
   */
  batch<K extends keyof S, R>(tables: readonly K[], fn: (tx: TransactionContext<S, K>) => Promise<R>): Promise<R>;
  /** Returns live (non-expired) record count for a table. */
  count<K extends keyof S>(table: K): Promise<number>;
  /** Returns live record counts and expired-but-not-yet-evicted counts per table. */
  debug(): Promise<DebugInfo<S>>;
  delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  /** Removes all records from the table. */
  clear<K extends keyof S>(table: K): Promise<void>;
  /** Releases all resources (observers, cross-tab channel, DB connection). */
  dispose(): void;
  get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]>;
  has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  /** Lazily iterate over all live records in a table. Useful for large datasets. */
  iterate<K extends keyof S>(table: K): AsyncIterable<RecordOf<S, K>>;
  observe<K extends keyof S>(
    table: K,
    listener: Observer<RecordOf<S, K>>,
    options?: { immediate?: boolean },
  ): () => void;
  put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void>;
  putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void>;
  query<K extends keyof S>(table: K): QueryBuilder<RecordOf<S, K>>;
  update<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    changes: Partial<RecordOf<S, K>>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K> | undefined>;
  /**
   * Insert-or-update a record atomically.
   * `fn` receives the current record (or `undefined`) and must return the new record.
   * The returned record's key field must match `key`.
   */
  upsert<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    fn: (existing: RecordOf<S, K> | undefined) => RecordOf<S, K>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K>>;
}
