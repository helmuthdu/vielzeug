import type { QueryBuilder } from './query';

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

/** Fluent builder returned by `table()` — satisfies `SchemaEntry` and adds `.ttl()` and `.index()` chaining. */
type TableBuilder<T extends Record<string, unknown>, Key extends keyof T & string> = SchemaEntry<T, Key> & {
  /**
   * Register a secondary index on the given field. Can be chained multiple times.
   * Only used by the IndexedDB adapter; other adapters fall back to in-memory filtering.
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

/* -------------------- Shared CRUD methods -------------------- */

/**
 * @internal Shared CRUD methods present on both `TransactionContext` and `Adapter`.
 * Not exported — use `TransactionContext` or `Adapter` directly.
 */
type SharedMethods<S extends AnySchema, K extends keyof S & string = keyof S & string> = {
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
   * Returns the primary key of every live record in the table without fetching the full records.
   * Useful for existence checks, diffing, and cache-invalidation.
   */
  keys<T extends K>(table: T): Promise<KeyOf<S, T>[]>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: TtlMs): Promise<void>;
  query<T extends K>(table: T): QueryBuilder<RecordOf<S, T>>;
  /**
   * Merge `changes` into the existing record identified by `key` and persist the result.
   * Throws `VaultError` if the key does not exist — use `upsert` for insert-or-update semantics.
   */
  update<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    changes: Partial<RecordOf<S, T>>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, T>>;
  upsert<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    fn: (existing: RecordOf<S, T> | undefined) => RecordOf<S, T>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, T>>;
};

/* -------------------- Transaction context -------------------- */

/**
 * Available inside `batch()` callbacks. For IndexedDB, operations run in a real atomic IDB transaction.
 * Extends `SharedMethods` (which already includes `getOrDefault`). The batch scope restricts
 * accessed tables to those declared in `batch(tables, fn)` — accessing others throws `VaultScopeError`.
 *
 * This is a stable public alias for `SharedMethods` retained so batch callback parameters can be
 * typed as `TransactionContext<S, K>` without depending on an internal type name.
 */
export type TransactionContext<S extends AnySchema, K extends keyof S & string = keyof S & string> = SharedMethods<
  S,
  K
>;

/* -------------------- Adapter interface -------------------- */

/**
 * Full client API. Shares all CRUD methods with `TransactionContext` and adds
 * batch, observe/watch, disposal, debug tooling, and explicit TTL pruning.
 */
export interface Adapter<S extends AnySchema> extends SharedMethods<S> {
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
  /** Releases all resources (observers, cross-tab channel, DB connection). */
  dispose(): Promise<void>;
  observe<K extends keyof S & string>(
    table: K,
    listener: Observer<RecordOf<S, K>>,
    options?: {
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
    options?: { signal?: AbortSignal },
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
  /**
   * Returns a Web Standard `ReadableStream` that emits a fresh snapshot of the table on every change.
   * The first chunk is emitted immediately (current table state).
   *
   * ```ts
   * db.watchStream('users').pipeTo(new WritableStream({ write: (users) => render(users) }));
   * ```
   *
   * @param options.mode
   *   - `'latest'` (default): if the consumer lags, intermediate snapshots are dropped.
   *   - `'all'`: every snapshot is enqueued in order.
   * @param options.signal - An `AbortSignal` that cancels the stream.
   */
  watchStream<K extends keyof S & string>(
    table: K,
    options?: { mode?: 'all' | 'latest'; signal?: AbortSignal },
  ): ReadableStream<RecordOf<S, K>[]>;
}
