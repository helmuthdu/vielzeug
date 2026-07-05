import type { QueryBuilder } from './query';

import { VaultError } from './errors';
import { assertTtlMs, type TtlMs, type VaultCodec } from './ttl';

/* -------------------- Re-export TtlMs and VaultCodec for public API -------------------- */

export type { TtlMs, VaultCodec };

/* -------------------- Schema types -------------------- */

/** @internal Unique symbol used as a phantom type brand — never appears at runtime. */
declare const schemaEntryBrand: unique symbol;

/**
 * Schema entry for a single table.
 * `T` is the record type; `Key` is the primary key field name.
 *
 * The phantom brand `[schemaEntryBrand]` holds `T` in a directly inferable position so
 * TypeScript can recover `T` in `RecordOf` conditional types. It uses a unique symbol key
 * so it is invisible in IDE autocompletion and cannot be set accidentally.
 */
export type SchemaEntry<T extends Record<string, unknown>, Key extends keyof T & string = keyof T & string> = {
  defaultTtl?: TtlMs;
  /**
   * Secondary index field names. The IndexedDB adapter creates an IDB index for each field,
   * enabling push-down optimisation for `equals`, `between`, and `startsWith` queries on those
   * fields — avoiding a full-table scan.
   *
   * ```ts
   * const schema = {
   *   users: table<User>('id').index('email').index('city'),
   * };
   * // db.query('users').equals('email', 'alice@example.com') → uses IDB index
   * ```
   */
  indexes?: readonly (keyof T & string)[];
  key: Key;
  /** @internal Phantom brand — enables TypeScript to infer T. Never has a runtime value. */
  readonly [schemaEntryBrand]?: T;
};

/** A schema is any record of `SchemaEntry`-compatible values. Checked structurally so that
 *  concrete `SchemaEntry<T, Key>` values satisfy it without covariance constraints. */
export type AnySchema = Record<string, { defaultTtl?: TtlMs; indexes?: readonly string[]; key: string }>;

/**
 * Fluent builder returned by `table()` — satisfies `SchemaEntry` and adds `.ttl()` and `.index()` chaining.
 * Export this type to annotate schema entry variables without using `ReturnType<typeof table<T, K>>`.
 */
export type TableBuilder<
  T extends Record<string, unknown>,
  Key extends keyof T & string = keyof T & string,
> = SchemaEntry<T, Key> & {
  /**
   * Register a secondary index on the given field. Can be chained multiple times.
   * Only used by the IndexedDB adapter; other adapters fall back to in-memory filtering.
   *
   * **Custom codec caveat:** the IndexedDB adapter creates the index with keyPath
   * `value.<field>`, which assumes the default `{ value, expiresAt? }` storage envelope
   * (see `VaultCodec`). A custom codec that changes the top-level shape (e.g.
   * `createVersionedCodec`, or a compact/encrypted format) breaks index push-down silently —
   * queries on the indexed field return empty results instead of throwing. Avoid combining
   * `.index()` with a non-default codec, or design the custom codec to preserve `value.<field>`.
   */
  index: <F extends keyof T & string>(field: F) => TableBuilder<T, Key>;
  /** Set a default TTL (ms) applied to all `put`/`putAll` calls that don't specify one explicitly. */
  ttl: (ms: TtlMs) => TableBuilder<T, Key>;
};

export function table<T extends Record<string, unknown>, Key extends keyof T & string = keyof T & string>(
  key: Key,
): TableBuilder<T, Key> {
  function makeBuilder(entry: SchemaEntry<T, Key>): TableBuilder<T, Key> {
    return {
      ...entry,
      index: <F extends keyof T & string>(field: F): TableBuilder<T, Key> => {
        const current = (entry.indexes ?? []) as readonly (keyof T & string)[];

        if (current.includes(field)) {
          throw new VaultError(`table index "${field}" is already registered`);
        }

        return makeBuilder({ ...entry, indexes: [...current, field] });
      },
      ttl: (ms: TtlMs): TableBuilder<T, Key> => {
        assertTtlMs(ms, 'table.ttl');

        return makeBuilder({ ...entry, defaultTtl: ms });
      },
    };
  }

  return makeBuilder({ key });
}

/** Extracts the record type from a schema table entry. */
export type RecordOf<S extends AnySchema, K extends keyof S> = S[K] extends SchemaEntry<infer R, string> ? R : never;

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

/* -------------------- Plugin / integration types -------------------- */

/**
 * Minimal logger interface satisfied structurally by `/rune` Logger.
 * Pass a rune Logger instance directly — no adapter needed:
 *
 * ```ts
 * import { createLogger } from '@vielzeug/rune';
 * const db = createMemory({ schema, logger: createLogger('db') });
 * ```
 *
 * Vault only emits error-level logs, so a single rune-compatible `error`
 * method is enough.
 */
export interface VaultLogger {
  error(messageOrContext?: Record<string, unknown> | Error | string, message?: string): void;
}

/**
 * Minimal synchronous validator interface satisfied structurally by
 * `/sieve` Schema.
 * Pass a sieve schema directly — no adapter needed:
 *
 * ```ts
 * import { s } from '@vielzeug/spell';
 * const db = createMemory({
 *   schema: { users: table<User>('id') },
 *   validators: { users: v.object({ id: v.number(), name: v.string() }) },
 * });
 * ```
 *
 * Vault requires synchronous validation because writes may execute inside a
 * live IndexedDB transaction. Any object with a `parse(value: unknown): T`
 * method works.
 */
export interface RecordValidator<T> {
  parse(value: unknown): T;
}

/**
 * Per-table record parsers. Keys match your vault schema table names.
 * Validators run before every `put`, `putAll`, and inside `update`/`upsert`.
 */
export type TableValidators<S extends AnySchema> = {
  [K in keyof S]?: RecordValidator<RecordOf<S, K>>;
};

/**
 * Minimal writable-signal interface satisfied structurally by
 * `/ripple` `Signal<T>` and `Store<T>`.
 * Pass a ripple signal directly — no adapter needed:
 *
 * ```ts
 * import { signal } from '@vielzeug/ripple';
 * const usersSignal = signal<User[]>([]);
 *
 * const db = createMemory({
 *   schema: { users: table<User>('id') },
 *   signals: { users: usersSignal },
 * });
 *
 * // usersSignal.value is now always in sync with the users table.
 * ```
 *
 * Any object with an `update(fn: (current: T) => T): void` method satisfies
 * this interface. Vault calls `signal.update(() => snapshot)` on each change.
 */
export interface ReactiveSignal<T> {
  update(fn: (current: T) => T): void;
}

/**
 * Per-table reactive signals. Keys match your vault schema table names.
 * Each signal is automatically kept in sync with the table via `observe()`.
 * Signals are wired at construction time and cleaned up on `dispose()`.
 */
export type TableSignals<S extends AnySchema> = {
  [K in keyof S]?: ReactiveSignal<RecordOf<S, K>[]>;
};

/* -------------------- Observer -------------------- */

export type Observer<T> = (records: T[]) => void;

/** A function that cancels an active subscription. Returned by `observe()` and `observeMany()`. */
export type Unsubscribe = () => void;

/* -------------------- Shared adapter options -------------------- */

/**
 * Common options shared by all adapter factories.
 * Individual adapters extend this with adapter-specific fields.
 */
export type BaseAdapterOptions<S extends AnySchema> = {
  /**
   * Pluggable serialization codec. Provide a custom implementation to change how values
   * are encoded at rest (e.g. compact keys, encryption, msgpack).
   * Defaults to the standard `{ value, expiresAt? }` JSON envelope.
   *
   * **IndexedDB + `.index()` caveat:** secondary indexes are created with keyPath
   * `value.<field>`, which assumes the default envelope shape. A custom codec that changes
   * the top-level shape breaks index push-down silently (queries return empty results
   * instead of throwing) — see `TableBuilder.index`.
   */
  codec?: VaultCodec;
  /** Structured logger. A /rune Logger satisfies VaultLogger directly. */
  logger?: VaultLogger;
  /** Performance monitoring hook. Called after every operation with duration in ms. */
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  /**
   * Per-table reactive signals. A /ripple Signal<T[]> satisfies ReactiveSignal directly.
   * Each signal is kept in sync with its table automatically via observe().
   */
  signals?: TableSignals<S>;
  /** Per-table validators. A /sieve Schema satisfies this directly via `parse()`. */
  validators?: TableValidators<S>;
};

/* -------------------- Metrics -------------------- */

export type MetricsEvent = {
  duration: number;
  operation:
    | 'batch'
    | 'clear'
    | 'count'
    | 'delete'
    | 'deleteMany'
    | 'entries'
    | 'get'
    | 'getAll'
    | 'getMany'
    | 'getOrDefault'
    | 'has'
    | 'isEmpty'
    | 'keys'
    | 'put'
    | 'putAll'
    | 'query'
    | 'queryDelete'
    | 'update'
    | 'upsert';
  /**
   * The table name. For `batch` operations this is `'*'` because a batch may
   * span multiple tables and there is no single canonical table name.
   */
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

/**
 * Available inside `batch()` callbacks. For IndexedDB, operations run in a real atomic IDB transaction.
 * The batch scope restricts accessed tables to those declared in `batch(tables, fn)` — accessing
 * others throws `VaultScopeError`.
 */
export type TransactionContext<S extends AnySchema, K extends keyof S & string = keyof S & string> = {
  clear<T extends K>(table: T): Promise<void>;
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  /** Delete multiple records by key in a single operation. Returns the number of records removed. */
  deleteMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<number>;
  /**
   * Returns all `[key, record]` pairs in the table.
   * Useful for cache-warming, migration scripts, and debugging.
   */
  entries<T extends K>(table: T): Promise<Array<[KeyOf<S, T>, RecordOf<S, T>]>>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  /** Fetch all records in the table. */
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  /** Fetch multiple records by key in a single operation. Preserves key order; missing keys yield `undefined`. */
  getMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<Array<RecordOf<S, T> | undefined>>;
  /**
   * Read-or-insert: returns the existing record if present, otherwise calls `defaultFn()`,
   * writes the result, and returns it. Equivalent to an `upsert` that never overwrites.
   *
   * **Not atomic for memory and WebStorage adapters.** Two concurrent calls may both observe
   * a missing record and both invoke `defaultFn()`, writing twice. For guaranteed atomicity,
   * wrap in `batch(['table'], tx => tx.getOrDefault(...))` with the IndexedDB adapter.
   */
  getOrDefault<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    defaultFn: () => RecordOf<S, T>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, T>>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  /** Returns `true` if the table contains no live records. Equivalent to `(await count(table)) === 0`. */
  isEmpty<T extends K>(table: T): Promise<boolean>;
  /**
   * Returns the primary key of every live record in the table.
   * Without a `filter`, uses a key-only backend path (no full records fetched).
   * Useful for existence checks, diffing, and cache-invalidation.
   *
   * Pass an optional `filter` predicate to restrict results — when provided, all records are
   * fetched internally and the predicate is applied before key extraction.
   */
  keys<T extends K>(table: T, filter?: (record: RecordOf<S, T>) => boolean): Promise<KeyOf<S, T>[]>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: TtlMs): Promise<void>;
  query<T extends K>(table: T): QueryBuilder<RecordOf<S, T>>;
  /**
   * Merge `changes` into the existing record identified by `key` and persist the result.
   * Returns `undefined` when the key does not exist — use `upsert` for insert-or-update semantics.
   */
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

/** Full client API for vault adapters. */
export interface Adapter<S extends AnySchema> {
  clear<K extends keyof S & string>(table: K): Promise<void>;
  count<K extends keyof S & string>(table: K): Promise<number>;
  delete<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  /** Delete multiple records by key in a single operation. Returns the number of records removed. */
  deleteMany<K extends keyof S & string>(table: K, keys: KeyOf<S, K>[]): Promise<number>;
  /**
   * Returns all `[key, record]` pairs in the table.
   * Useful for cache-warming, migration scripts, and debugging.
   */
  entries<K extends keyof S & string>(table: K): Promise<Array<[KeyOf<S, K>, RecordOf<S, K>]>>;
  get<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  /** Fetch all records in the table. */
  getAll<K extends keyof S & string>(table: K): Promise<RecordOf<S, K>[]>;
  /** Fetch multiple records by key in a single operation. Preserves key order; missing keys yield `undefined`. */
  getMany<K extends keyof S & string>(table: K, keys: KeyOf<S, K>[]): Promise<Array<RecordOf<S, K> | undefined>>;
  /**
   * Read-or-insert: returns the existing record if present, otherwise calls `defaultFn()`,
   * writes the result, and returns it. Equivalent to an `upsert` that never overwrites.
   *
   * **Not atomic for memory and WebStorage adapters.** Two concurrent calls may both observe
   * a missing record and both invoke `defaultFn()`, writing twice. For guaranteed atomicity,
   * wrap in `batch(['table'], tx => tx.getOrDefault(...))` with the IndexedDB adapter.
   */
  getOrDefault<K extends keyof S & string>(
    table: K,
    key: KeyOf<S, K>,
    defaultFn: () => RecordOf<S, K>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K>>;
  has<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  /** Returns `true` if the table contains no live records. Equivalent to `(await count(table)) === 0`. */
  isEmpty<K extends keyof S & string>(table: K): Promise<boolean>;
  /**
   * Returns the primary key of every live record in the table.
   * Without a `filter`, uses a key-only backend path (no full records fetched).
   * Useful for existence checks, diffing, and cache-invalidation.
   *
   * Pass an optional `filter` predicate to restrict results — when provided, all records are
   * fetched internally and the predicate is applied before key extraction.
   */
  keys<K extends keyof S & string>(table: K, filter?: (record: RecordOf<S, K>) => boolean): Promise<KeyOf<S, K>[]>;
  put<K extends keyof S & string>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void>;
  putAll<K extends keyof S & string>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void>;
  query<K extends keyof S & string>(table: K): QueryBuilder<RecordOf<S, K>>;
  /**
   * Merge `changes` into the existing record identified by `key` and persist the result.
   * Returns `undefined` when the key does not exist — use `upsert` for insert-or-update semantics.
   */
  update<K extends keyof S & string>(
    table: K,
    key: KeyOf<S, K>,
    changes: Partial<RecordOf<S, K>>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K> | undefined>;
  upsert<K extends keyof S & string>(
    table: K,
    key: KeyOf<S, K>,
    fn: (existing: RecordOf<S, K> | undefined) => RecordOf<S, K>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K>>;
  /**
   * Execute multiple operations against a set of tables with deferred observer notifications.
   *
   * All observer callbacks fire once per dirty table after `fn` resolves, instead of after
   * each individual write. Inside `fn`, only the tables declared in `tables` may be accessed.
   *
   * **Atomicity:** For the IndexedDB adapter this runs as a real IDB transaction — all writes
   * are atomic and rolled back on error. For the memory and WebStorage adapters the operation
   * is **not atomic** — concurrent `batch()` calls or concurrent mutations may interleave.
   */
  batch<K extends keyof S & string, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
  ): Promise<R>;
  /** Returns live record counts and expired-but-not-yet-evicted counts per table. */
  debug(): Promise<DebugInfo<S>>;
  /** `AbortSignal` aborted when `dispose()` is called. Use to tie external lifetimes to this adapter. */
  readonly disposalSignal: AbortSignal;
  /** Releases all resources (observers, cross-tab channel, DB connection). */
  dispose(): Promise<void>;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /** Delegates to `dispose()`. Enables `await using` declarations. */
  [Symbol.asyncDispose](): Promise<void>;
  observe<K extends keyof S & string>(
    table: K,
    listener: Observer<RecordOf<S, K>>,
    options?: {
      /**
       * When `false`, skips the automatic initial snapshot fired on registration.
       * Useful when the caller already has the current table state (e.g. from a
       * preceding `getAll()` call) and only wants change notifications.
       * Defaults to `true`.
       */
      immediate?: boolean;
      /**
       * An `AbortSignal` that, when aborted, automatically unsubscribes this observer.
       * Aligns with the platform pattern used by `fetch`, `addEventListener`, etc.
       *
       * ```ts
       * const controller = new AbortController();
       * db.observe('users', (users) => render(users), { signal: controller.signal });
       * // later:
       * controller.abort(); // stops the observer
       * ```
       */
      signal?: AbortSignal;
    },
  ): Unsubscribe;
  /**
   * Observe multiple tables simultaneously. The listener receives a combined snapshot
   * `{ [tableName]: RecordOf<S, T>[] }` and fires once after all tables have delivered
   * their first snapshot (initial load). Subsequent firings are coalesced per microtask,
   * so a batch that writes to multiple observed tables triggers exactly one combined callback.
   *
   * @param tables - The tables to observe. Must be non-empty.
   * @param listener - Called with a snapshot map keyed by table name.
   * @param options.signal - An `AbortSignal` that automatically unsubscribes all observers.
   * @returns An unsubscribe function that stops all underlying observers.
   */
  observeMany<K extends keyof S & string>(
    tables: readonly K[],
    listener: (snapshots: { [T in K]: RecordOf<S, T>[] }) => void,
    options?: {
      /**
       * When `true`, fires the listener as soon as any table delivers its first snapshot,
       * using empty arrays for tables not yet resolved. Defaults to `false` (wait for all tables).
       *
       * Useful when some tables may be large and you want to render partial data immediately.
       */
      eager?: boolean;
      signal?: AbortSignal;
    },
  ): Unsubscribe;
  /**
   * Explicitly delete all TTL-expired records from the specified tables (or all tables when
   * no filter is provided). Returns the number of records pruned per table.
   *
   * Useful as a scheduled maintenance task for write-heavy tables that are rarely
   * read (lazy eviction would not reclaim storage otherwise).
   *
   * ```ts
   * // Prune all tables
   * await db.pruneExpired();
   *
   * // Prune only TTL-bearing tables
   * await db.pruneExpired(['sessions', 'tokens']);
   * ```
   *
   * **Does not trigger observer callbacks.** TTL-expired records are already logically
   * absent, so their physical removal does not change observable state.
   */
  pruneExpired(tables?: readonly (keyof S & string)[]): Promise<{ [K in keyof S & string]: number }>;
  /**
   * An AsyncIterable that yields a fresh snapshot of the table on every change.
   * The first value is emitted immediately.
   *
   * ```ts
   * for await (const users of db.watch('users')) {
   *   render(users);
   * }
   * ```
   *
   * Pass an `AbortSignal` to stop iteration from outside the loop:
   * ```ts
   * const controller = new AbortController();
   * for await (const users of db.watch('users', { signal: controller.signal })) {
   *   render(users);
   * }
   * controller.abort(); // stops the iteration
   * ```
   *
   * @param options.mode
   *   - `'latest'` (default): if the consumer lags, intermediate snapshots are dropped and
   *     only the most recent one is retained. Best for rendering/display use-cases.
   *   - `'all'`: every snapshot is queued and delivered in order. Use when every intermediate
   *     state matters (audit trails, animation frames).
   * @param options.signal - An `AbortSignal` that stops the iteration.
   */
  watch<K extends keyof S & string>(
    table: K,
    options?: { mode?: 'all' | 'latest'; signal?: AbortSignal },
  ): AsyncIterable<RecordOf<S, K>[]>;
}
