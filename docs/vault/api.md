---
title: Vault — API Reference
description: Complete API reference for Vault adapters, schema helpers, query builder, and plugin types.
---

[[toc]]

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/vault` | Main exports and types |

## API At a Glance

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `table<T>(key)` | Create a typed schema entry | Sync | `key` must be a `string` field of `T` |
| `ttl` | Duration helpers for TTL values | Sync | Raw numbers are rejected at the type level — always use `ttl.*` |
| `createLocalStorage(opts)` | LocalStorage adapter | Sync | Quota errors surface as `VaultQuotaError`; configure `onQuotaExceeded` |
| `createSessionStorage(opts)` | SessionStorage adapter | Sync | Data is lost when the tab closes |
| `createIndexedDB(opts)` | IndexedDB adapter with iterate and atomic batch | Sync (lazy open) | First operation opens the DB; call `dispose()` to close it |
| `createMemory(opts)` | In-memory adapter for tests and SSR | Sync | Data is not persisted across reloads |
| `scheduleExpiredPrune(adapter, opts)` | Schedule periodic TTL pruning | Sync | Returns a stop function — call it on teardown to cancel the timer |
| `db.put / putAll` | Write one or many records | Async | Validators run on every write — a failed `parse()` throws before touching storage |
| `db.get / getAll / getMany` | Read records | Async | Expired records are never returned — check `db.debug()` for expired count |
| `db.query(table)` | Start a lazy query pipeline | Sync (lazy) | `count()` respects `limit`/`offset`; use `totalCount()` for the full set size |
| `db.batch(tables, fn)` | Multi-table write with deferred notifications | Async | On IDB, the callback throwing aborts the whole transaction |
| `db.observe(table, fn)` | Subscribe to table changes | Sync | Returns an unsubscribe function — forgetting to call it leaks listeners |
| `db.watch(table)` | Async iterable of table snapshots | Async | Always yields an initial snapshot before waiting for changes |
| `db.iterate(table)` | Cursor-based async iteration — IDB only | Async | Not available on memory or web storage adapters |
| `db.upsert(table, key, fn)` | Read-modify-write | Async | `fn` always receives the current record; never the stale previous value |
| `db.dispose()` | Release all resources | Sync | All subsequent operations throw `VaultDisposedError` |

## Exports

**Values:** `createLocalStorage`, `createSessionStorage`, `createIndexedDB`, `createMemory`, `table`, `ttl`, `scheduleExpiredPrune`, `VaultError`, `VaultDisposedError`, `VaultMigrationError`, `VaultQuotaError`, `VaultScopeError`

**Types:** `Adapter`, `AnySchema`, `BaseAdapterOptions`, `DebugInfo`, `DebugStats`, `VaultLogger`, `IndexedDbAdapter`, `KeyOf`, `MetricsEvent`, `MigrationContext`, `MigrationFn`, `Observer`, `QueryBuilder`, `ReactiveSignal`, `ReadQuery`, `RecordOf`, `RecordValidator`, `SchemaEntry`, `TableSignals`, `TableValidators`, `TransactionContext`, `TtlMs`

---

## Schema Helper

### `table`

```ts
function table<T extends Record<string, unknown>, Key extends keyof T & string = keyof T & string>(
  key: Key,
): TableBuilder<T, Key>
```

Creates a typed schema entry. The primary-key field `key` must be a field of `T`.

```ts
type User = { id: number; name: string };

const schema = {
  users: table<User>('id'),
};
```

Chain `.ttl(ms)` to apply a default TTL to all writes on the table:

```ts
import { table, ttl } from '@vielzeug/vault';

const schema = {
  sessions: table<Session>('id').ttl(ttl.minutes(30)),
};
```

The TypeScript compiler will reject keys that do not exist on `T`, and downstream operations (`get`, `delete`, `has`, `upsert`) accept only the correct key type.

---

## TTL Helper

```ts
import { ttl, type TtlMs } from '@vielzeug/vault';

ttl.ms(n: number): TtlMs
ttl.seconds(n: number): TtlMs
ttl.minutes(n: number): TtlMs
ttl.hours(n: number): TtlMs
ttl.days(n: number): TtlMs
```

`TtlMs` is a branded `number` type. Raw numeric literals are rejected by the type checker — always use these helpers.

All helpers throw synchronously if `n` is not a finite non-negative number. Passing an invalid `TtlMs` value directly to a write method also throws.

---

## `scheduleExpiredPrune`

```ts
function scheduleExpiredPrune<S extends AnySchema>(
  adapter: Pick<Adapter<S>, 'pruneExpired'>,
  options: { interval: number },
): () => void
```

Calls `adapter.pruneExpired()` on a repeating interval. Returns a `stop` function that cancels the schedule.

```ts
import { scheduleExpiredPrune, ttl } from '@vielzeug/vault';

const stop = scheduleExpiredPrune(db, { interval: ttl.hours(1) });

// cancel on teardown
stop();
```

---

## Factories

All four factories accept the same optional plugin options and return `Adapter<S>`.

### `createLocalStorage`

```ts
createLocalStorage<S extends AnySchema>(options: {
  logger?: VaultLogger;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  onQuotaExceeded?: (table: keyof S, error: VaultQuotaError) => 'ignore' | 'throw';
  schema: S;
  signals?: TableSignals<S>;
  validators?: TableValidators<S>;
}): Adapter<S>
```

`onQuotaExceeded` is called when a `setItem` throws a `QuotaExceededError`. Return `'ignore'` to silently drop the write, or `'throw'` (default) to rethrow.

### `createSessionStorage`

```ts
createSessionStorage<S extends AnySchema>(options: {
  logger?: VaultLogger;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  onQuotaExceeded?: (table: keyof S, error: VaultQuotaError) => 'ignore' | 'throw';
  schema: S;
  signals?: TableSignals<S>;
  validators?: TableValidators<S>;
}): Adapter<S>
```

### `createIndexedDB`

```ts
createIndexedDB<S extends AnySchema>(options: {
  logger?: VaultLogger;
  migrate?: MigrationFn;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  signals?: TableSignals<S>;
  validators?: TableValidators<S>;
  version: number;
}): IndexedDbAdapter<S>
```

Returns an `IndexedDbAdapter<S>`, which extends `Adapter<S>` with the cursor-based `iterate()` method. The IDB adapter opens the database lazily on first operation. `migrate` is called during `onupgradeneeded` when `version` is higher than the stored version. The adapter also opens a `BroadcastChannel` (when available) so observer notifications propagate across tabs.

### `createMemory`

```ts
createMemory<S extends AnySchema>(options: {
  logger?: VaultLogger;
  name?: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  signals?: TableSignals<S>;
  validators?: TableValidators<S>;
}): Adapter<S>
```

When `name` is provided and `BroadcastChannel` is available, all `createMemory` instances with the same `name` in the same origin replicate mutations to each other (cross-tab synchronisation). If `BroadcastChannel` is not available, the option is silently ignored.

---

## IndexedDbAdapter

`IndexedDbAdapter<S>` is the type returned by `createIndexedDB`. It extends `Adapter<S>` with one additional method:

```ts
export type IndexedDbAdapter<S extends AnySchema> = Adapter<S> & {
  /**
   * Cursor-based lazy iteration over all live records in the table.
   * Records are streamed via an IDB cursor — the full table is never materialized in memory.
   * Expired records are skipped automatically.
   *
   * Each call opens a fresh readonly IDB transaction.
   * Throws `VaultDisposedError` if called after `dispose()`.
   */
  iterate<K extends keyof S>(table: K): AsyncIterable<RecordOf<S, K>>;
};
```

**Usage:**

```ts
import { createIndexedDB, table } from '@vielzeug/vault';
import type { IndexedDbAdapter } from '@vielzeug/vault';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const db: IndexedDbAdapter<typeof schema> = createIndexedDB({ name: 'app', schema, version: 1 });

for await (const user of db.iterate('users')) {
  await processUser(user);
}
```

> `iterate` is only available on the IndexedDB adapter — memory and web storage adapters use `getAll()` or `query().toArray()` for full-table reads.

---

## Adapter Interface

```ts
interface Adapter<S extends AnySchema> {
  /**
   * Multi-table write with deferred notifications. Atomic on IndexedDB.
   * Only tables listed in `tables` can be accessed inside the callback.
   */
  batch<K extends keyof S, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
  ): Promise<R>;

  /** Count of live (non-expired) records. */
  count<K extends keyof S>(table: K): Promise<number>;

  /** Live vs expired record counts per table. For development use. */
  debug(): Promise<DebugInfo<S>>;

  delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;

  /** Delete multiple records by key in a single operation. Returns the count of deleted records. */
  deleteMany<K extends keyof S>(table: K, keys: KeyOf<S, K>[]): Promise<number>;

  /** Remove all records from the table. */
  clear<K extends keyof S>(table: K): Promise<void>;

  /** Release all resources (observers, signal subscriptions, channel, DB connection). */
  dispose(): void;

  get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]>;

  /**
   * Fetch multiple records by key in a single operation.
   * Preserves input key order. Missing keys yield `undefined`.
   */
  getMany<K extends keyof S>(table: K, keys: KeyOf<S, K>[]): Promise<Array<RecordOf<S, K> | undefined>>;

  has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;

  /**
   * Subscribe to table changes. Does **not** fire an initial snapshot by default.
   * Pass `{ immediate: true }` to also receive the current table state on registration.
   * Returns an unsubscribe function — call it on teardown.
   */
  observe<K extends keyof S>(
    table: K,
    listener: Observer<RecordOf<S, K>>,
    options?: { immediate?: boolean },
  ): () => void;

  /**
   * Subscribe to multiple tables at once. Fires a combined snapshot `{ [tableName]: records[] }`
   * whenever any observed table changes. All tables are eagerly prefetched on registration.
   * Throws `VaultScopeError` when `tables` is empty.
   * Returns an unsubscribe function — call it on teardown.
   */
  observeMany<K extends keyof S>(
    tables: readonly K[],
    listener: (snapshots: { [T in K]: RecordOf<S, T>[] }) => void,
    options?: { immediate?: boolean },
  ): () => void;

  /**
   * Explicitly delete all TTL-expired records from every table.
   * Returns the number of records pruned per table.
   */
  pruneExpired(): Promise<{ [K in keyof S & string]: number }>;

  put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void>;
  putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void>;
  query<K extends keyof S>(table: K): QueryBuilder<RecordOf<S, K>>;

  update<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    changes: Partial<RecordOf<S, K>>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K> | undefined>;

  /** Read-modify-write. `fn` receives the current record (or undefined) and returns the new record. */
  upsert<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    fn: (existing: RecordOf<S, K> | undefined) => RecordOf<S, K>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K>>;

  /**
   * Async iterator that yields a fresh snapshot on every table change,
   * starting with an immediate snapshot. Auto-cleans up its observer on exit.
   */
  watch<K extends keyof S>(table: K): AsyncIterable<RecordOf<S, K>[]>;
}
```

### `observe` options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `immediate` | `boolean` | `false` | Fire the listener immediately with the current table contents |

Returns an unsubscribe function. Call it on teardown to prevent memory leaks.

### `observeMany` options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `immediate` | `boolean` | `false` | Fire the listener once all tables have been prefetched (current state) |

---

## TransactionContext

Available inside `batch()` callbacks.

```ts
type TransactionContext<S extends AnySchema, K extends keyof S = keyof S> = {
  clear<T extends K>(table: T): Promise<void>;
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  /** Delete multiple records by key. Returns the count of deleted records. */
  deleteMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<number>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  /** Fetch multiple records by key. Preserves key order; missing keys yield `undefined`. */
  getMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<Array<RecordOf<S, T> | undefined>>;
  /**
   * Return the existing record if found, otherwise call `defaultFn()`, write it, and return it.
   * On IndexedDB the check and insert are atomic (same IDB transaction).
   */
  getOrDefault<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    defaultFn: () => RecordOf<S, T>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, T>>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
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
```

`batch()` is scoped to the tables listed in the first argument. The table list must not be empty, and operations on unlisted tables are rejected at both type level and runtime.

> `getOrDefault` is only available inside `batch()` callbacks — it is not on the top-level `Adapter`.

---

## QueryBuilder

Queries are lazy pipelines. Operations accumulate until a terminal method is called.

```ts
interface QueryBuilder<T extends Record<string, unknown>> {
  // filter operators (chainable)
  filter(fn: (value: T, index: number, array: T[]) => boolean): QueryBuilder<T>;
  equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T>;
  between<K extends ComparableFieldKeys<T>>(field: K, lower: T[K], upper: T[K]): QueryBuilder<T>;
  startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): QueryBuilder<T>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
  limit(n: number): QueryBuilder<T>;
  offset(n: number): QueryBuilder<T>;

  // terminal methods
  toArray(): Promise<T[]>;
  /**
   * Number of matching records after all operations, including `limit` and `offset`.
   * Use `totalCount()` to get the full filtered set size ignoring pagination.
   */
  count(): Promise<number>;
  /**
   * Number of records matching the applied filter predicates.
   * `limit`, `offset`, and `orderBy` are ignored — always returns the full filtered set size.
   * Use this for "page X of N" UIs where you need the total alongside a paginated slice.
   */
  totalCount(): Promise<number>;
  first(): Promise<T | undefined>;
  delete(): Promise<number>;
}
```

`delete()` returns the number of records removed. `between` and `orderBy` accept `number | string` fields.

`ReadQuery<T>` is the same interface without `delete()`. Both are exported.

---

## Migration

```ts
type MigrationContext = {
  db: IDBDatabase;
  newVersion: number | null;
  oldVersion: number;
  tx: IDBTransaction;
};

type MigrationFn = (ctx: MigrationContext) => void;
```

---

## Types

### `AnySchema`

The constraint type for all schema objects — a record whose values are `SchemaEntry` instances.

```ts
type AnySchema = Record<string, SchemaEntry<Record<string, unknown>, string>>;
```

### `SchemaEntry`

The opaque type produced by `table<T>(key)`. Carries the record type and primary-key field at the type level.

```ts
type SchemaEntry<T extends Record<string, unknown>, Key extends keyof T & string> = {
  defaultTtl?: TtlMs;
  key: Key;
};
```

### `RecordOf`

Extracts the record type for a given table key.

```ts
type RecordOf<S extends AnySchema, K extends keyof S> = /* inferred from SchemaEntry */;
```

### `KeyOf`

Extracts the primary-key value type for a given table key.

```ts
type KeyOf<S extends AnySchema, K extends keyof S> = /* inferred from SchemaEntry */;
```

### `TtlMs`

A branded `number` representing milliseconds. Produced only by `ttl.*` helpers. Raw numbers are rejected by the type system.

```ts
type TtlMs = number & { readonly __brand: 'TtlMs' };
```

### `Observer`

Callback type for `observe()` and `observeMany()`.

```ts
type Observer<T> = (records: T[]) => void;
```

### `BaseAdapterOptions`

Shared plugin options accepted by all four adapter factories.

```ts
type BaseAdapterOptions<S extends AnySchema> = {
  logger?: VaultLogger;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  signals?: TableSignals<S>;
  validators?: TableValidators<S>;
};
```

### `MigrationContext` / `MigrationFn`

Passed to the `migrate` callback in `createIndexedDB`.

```ts
type MigrationContext = {
  db: IDBDatabase;
  newVersion: number | null;
  oldVersion: number;
  tx: IDBTransaction;
};

type MigrationFn = (ctx: MigrationContext) => void;
```

### `DebugStats` / `DebugInfo`

Returned by `db.debug()`.

```ts
type DebugStats = {
  expiredCount: number; // TTL-expired records not yet evicted
  recordCount: number;  // live (non-expired) records
};

type DebugInfo<S extends AnySchema> = {
  tables: Array<{ name: keyof S & string } & DebugStats>;
};
```

### `VaultLogger`

Minimal logger interface satisfied structurally by `@vielzeug/rune` Logger. Pass a rune instance directly — no adapter needed.

```ts
interface VaultLogger {
  error(messageOrContext?: Record<string, unknown> | Error | string, message?: string): void;
}
```

### `ReactiveSignal` / `TableSignals`

Plugin type for the `signals` option. `@vielzeug/ripple` `Signal<T>` and `Store<T>` both satisfy `ReactiveSignal<T>` structurally.

```ts
interface ReactiveSignal<T> {
  update(fn: (current: T) => T): void;
}

type TableSignals<S extends AnySchema> = {
  [K in keyof S]?: ReactiveSignal<RecordOf<S, K>[]>;
};
```

### `RecordValidator` / `TableValidators`

Plugin type for the `validators` option. A `@vielzeug/spell` schema satisfies `RecordValidator` directly. Validators run before every `put`, `putAll`, `update`, and `upsert`.

```ts
interface RecordValidator<T> {
  parse(value: unknown): T;
}

type TableValidators<S extends AnySchema> = {
  [K in keyof S]?: RecordValidator<RecordOf<S, K>>;
};
```

### `MetricsEvent`

Passed to `onMetrics` after every operation.

```ts
type MetricsEvent = {
  duration: number;
  operation:
    | 'batch' | 'count' | 'delete' | 'deleteMany' | 'clear' | 'get' | 'getAll' | 'getMany'
    | 'has' | 'put' | 'putAll' | 'query' | 'queryDelete'
    | 'update' | 'upsert';
  /** Table name. For `batch` operations this is `'*'` because a batch may span multiple tables. */
  table: string;
};
```

### `QueryBuilder` / `ReadQuery`

`QueryBuilder<T>` is the full pipeline type. `ReadQuery<T>` is the same interface without `delete()`. Both are exported.

```ts
interface QueryBuilder<T extends Record<string, unknown>> {
  filter(fn: (value: T, index: number, array: T[]) => boolean): QueryBuilder<T>;
  equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T>;
  between<K extends ComparableFieldKeys<T>>(field: K, lower: T[K], upper: T[K]): QueryBuilder<T>;
  startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): QueryBuilder<T>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
  limit(n: number): QueryBuilder<T>;
  offset(n: number): QueryBuilder<T>;
  toArray(): Promise<T[]>;
  count(): Promise<number>;
  totalCount(): Promise<number>;
  first(): Promise<T | undefined>;
  delete(): Promise<number>;
}
```

---

## Errors

All errors thrown by `@vielzeug/vault` extend `VaultError`. Catch the base class for a catch-all, or catch specific subclasses for fine-grained handling.

```ts
import {
  VaultDisposedError,
  VaultError,
  VaultMigrationError,
  VaultQuotaError,
  VaultScopeError,
} from '@vielzeug/vault';
```

| Class | Extends | Thrown when |
| --- | --- | --- |
| `VaultError` | `Error` | Base class — catch-all for any vault error |
| `VaultDisposedError` | `VaultError` | Any operation after `dispose()` has been called |
| `VaultScopeError` | `VaultError` | `batch()` accesses a table outside its declared scope; empty array passed to `observeMany` |
| `VaultQuotaError` | `VaultError` | A LocalStorage / SessionStorage write exceeds the storage quota |
| `VaultMigrationError` | `VaultError` | IndexedDB `onupgradeneeded` migration callback threw |
