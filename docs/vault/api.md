---
title: Vault — API Reference
description: Complete API reference for Vault adapters, schema helpers, query builder, and plugin types.
---

[[toc]]

## API Overview

| Symbol                                | Purpose                                                        | Execution mode   | Common gotcha                                                                       |
| ------------------------------------- | -------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------- |
| `table<T>(key)`                       | Create a typed schema entry                                    | Sync             | `key` must be a `string` field of `T`                                               |
| `ttl`                                 | Duration helpers for TTL values                                | Sync             | Raw numbers are rejected at the type level — always use `ttl.*`                     |
| `createLocalStorage(opts)`            | LocalStorage adapter                                           | Sync             | Quota errors surface as `VaultQuotaError`; configure `onQuotaExceeded`              |
| `createSessionStorage(opts)`          | SessionStorage adapter                                         | Sync             | Data is lost when the tab closes                                                    |
| `createIndexedDB(opts)`               | IndexedDB adapter with iterate and atomic batch                | Sync (lazy open) | First operation opens the DB; call `dispose()` to close it                          |
| `createMemory(opts)`                  | In-memory adapter for tests and SSR                            | Sync             | Data is not persisted across reloads                                                |
| `scheduleExpiredPrune(adapter, opts)` | Schedule periodic TTL pruning                                  | Sync             | Auto-stops on `VaultDisposedError`; pass `onError` to surface non-disposal errors   |
| `db.put / putAll`                     | Write one or many records                                      | Async            | Validators run on every write — a failed `parse()` throws before touching storage   |
| `db.get / getAll / getMany`           | Read records                                                   | Async            | Expired records are never returned — check `db.debug()` for expired count           |
| `db.keys(table, filter?)`             | Return primary keys; optional filter predicate                 | Async            | With `filter`, fetches all records internally — no native key-only path             |
| `createVersionedCodec(versions, v)`   | Codec that dispatches by version number                        | Sync             | Records from other codecs (no `__v` field) decode as `undefined` — migrate first    |
| `db.entries(table)`                   | Return all `[key, record]` pairs                               | Async            | Skips expired records                                                               |
| `db.getOrDefault(table, key, fn)`     | Read-or-insert at the adapter level                            | Async            | Not atomic on memory/WebStorage; wrap in `batch()` on IDB for atomicity             |
| `db.query(table)`                     | Start a lazy query pipeline                                    | Sync (lazy)      | `count()` respects `limit`/`offset`; use `totalCount()` for the full set size       |
| `db.batch(tables, fn)`                | Multi-table write with deferred notifications                  | Async            | Atomic only on IndexedDB — a dev warning fires on Memory/WebStorage adapters        |
| `db.isEmpty(table)`                   | Returns `true` when the table has no live records              | Async            | Treats TTL-expired records as absent — consistent with `count()`                    |
| `db.observe(table, fn, opts?)`        | Subscribe to table changes — fires immediately on registration | Sync             | Pass `{ immediate: false }` to skip the initial snapshot; returns `Unsubscribe`     |
| `db.watch(table, opts?)`              | Async iterable of table snapshots                              | Async            | Subscribes eagerly on `[Symbol.asyncIterator]()`; always pass `signal` or `break`   |
| `db.iterate(table)`                   | Cursor-based async iteration — IDB only                        | Async            | Not available on memory or web storage adapters                                     |
| `toReadableStream(iterable)`          | Convert `db.watch()` to a `ReadableStream`                     | Sync             | Always cancel the stream when done to stop the underlying observer                  |
| `isExpired(expiresAt)`                | Check if an epoch-ms timestamp has passed                      | Sync             | Safe to call with `undefined` — returns `false`                                     |
| `db.update(table, key, changes)`      | Merge fields into an existing record                           | Async            | Returns `undefined` when the key does not exist — use `upsert` for insert-or-update |
| `db.upsert(table, key, fn)`           | Read-modify-write                                              | Async            | `fn` always receives the current record; never the stale previous value             |
| `db.disposalSignal`                   | `AbortSignal` aborted on disposal                              | Sync getter      | Tie external lifetimes (timers, streams) to this adapter                            |
| `db.dispose()`                        | Release all resources                                          | Async            | Idempotent; all subsequent operations throw `VaultDisposedError`                    |
| `db.disposed`                         | `true` after `dispose()` is called                             | Sync getter      | —                                                                                   |
| `db[Symbol.asyncDispose]()`           | Delegates to `dispose()`                                       | Async            | Enables `await using` declarations                                                  |

## Package Entry Point

| Import            | Purpose                |
| ----------------- | ---------------------- |
| `@vielzeug/vault` | Main exports and types |

## Schema Helper

### `table`

```ts
function table<T extends Record<string, unknown>, Key extends keyof T & string = keyof T & string>(
  key: Key,
): TableBuilder<T, Key>;
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

Chain `.index(field)` to register secondary indexes (IndexedDB only). Calling `.index()` twice with the same field throws `VaultError` synchronously:

```ts
// <ore-icon name="check" size="16"></ore-icon> valid
const schema = { products: table<Product>('id').index('category').index('name') };

// <ore-icon name="x" size="16"></ore-icon> throws VaultError: table index "category" is already registered
const bad = table<Product>('id').index('category').index('category');
```

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

All helpers throw synchronously if `n` is not a finite positive number (zero is rejected because it would create an immediately-expired record). Values that overflow to `Infinity` after multiplication are also rejected. Passing an invalid `TtlMs` value directly to a write method also throws.

## `scheduleExpiredPrune`

```ts
function scheduleExpiredPrune<S extends AnySchema>(
  adapter: Pick<Adapter<S>, 'pruneExpired'>,
  options: {
    interval: number;
    onError?: (err: unknown) => void;
    signal?: AbortSignal;
  },
): () => void;
```

Calls `adapter.pruneExpired()` on a repeating interval. Returns a `stop` function.

The schedule stops automatically if `pruneExpired()` throws `VaultDisposedError` — no cleanup needed after `dispose()` if the adapter is disposed before the timer fires.

Without `onError`, other errors from `pruneExpired()` (e.g. IDB failures) emit a `[@vielzeug/vault]` dev warning and the interval continues running. Pass `onError` to handle them programmatically:

```ts
import { scheduleExpiredPrune, ttl } from '@vielzeug/vault';

const stop = scheduleExpiredPrune(db, {
  interval: ttl.hours(1),
  onError: (err) => console.error('prune failed:', err),
});

// cancel on teardown (before dispose)
stop();
```

Pass `signal` to tie the schedule lifetime to an `AbortController` or `db.disposalSignal`:

```ts
// auto-stop when the adapter is disposed
scheduleExpiredPrune(db, {
  interval: ttl.hours(1),
  signal: db.disposalSignal,
});
```

## Factories

All four factories accept the same optional plugin options and return `Adapter<S>`.

### `createLocalStorage`

```ts
createLocalStorage<S extends AnySchema>(options: {
  codec?: VaultCodec;
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

> **Note:** If the underlying storage is unavailable (e.g. private browsing, sandboxed iframe), the factory throws a `VaultError` synchronously.

### `createSessionStorage`

```ts
createSessionStorage<S extends AnySchema>(options: {
  codec?: VaultCodec;
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
  codec?: VaultCodec;
  logger?: VaultLogger;
  migrate?: MigrationFn;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  signals?: TableSignals<S>;
  validators?: TableValidators<S>;
  version?: number;
}): IndexedDbAdapter<S>
```

Returns an `IndexedDbAdapter<S>`, which extends `Adapter<S>` with the cursor-based `iterate()` method. The IDB adapter opens the database lazily on first operation. `migrate` is called during `onupgradeneeded` when `version` is higher than the stored version. `version` defaults to `1` when omitted. The adapter also opens a `BroadcastChannel` (when available) so observer notifications propagate across tabs.

### `createMemory`

```ts
createMemory<S extends AnySchema>(options: {
  codec?: VaultCodec;
  logger?: VaultLogger;
  name?: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  signals?: TableSignals<S>;
  validators?: TableValidators<S>;
}): Adapter<S>
```

When `name` is provided and `BroadcastChannel` is available, all `createMemory` instances with the same `name` in the same origin replicate mutations to each other (cross-tab synchronisation). If `BroadcastChannel` is not available, the option is silently ignored.

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

## Adapter Interface

```ts
interface Adapter<S extends AnySchema> {
  /**
   * Multi-table write with deferred notifications. Atomic on IndexedDB.
   * Only tables listed in `tables` can be accessed inside the callback.
   */
  batch<K extends keyof S, R>(tables: readonly K[], fn: (tx: TransactionContext<S, K>) => Promise<R>): Promise<R>;

  /** Count of live (non-expired) records. */
  count<K extends keyof S>(table: K): Promise<number>;

  /** Live vs expired record counts per table. For development use.
   * Also warms the internal `count()` cache for every table. */
  debug(): Promise<DebugInfo<S>>;

  delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;

  /** Delete multiple records by key in a single operation. Returns the count of deleted records. */
  deleteMany<K extends keyof S>(table: K, keys: KeyOf<S, K>[]): Promise<number>;

  /** Remove all records from the table. */
  clear<K extends keyof S>(table: K): Promise<void>;

  /** `AbortSignal` aborted when `dispose()` is called. Use to tie external lifetimes to this adapter. */
  readonly disposalSignal: AbortSignal;

  /** Release all resources (observers, signal subscriptions, channel, DB connection). Idempotent. */
  dispose(): Promise<void>;

  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;

  /** Delegates to `dispose()`. Enables `await using` declarations. */
  [Symbol.asyncDispose](): Promise<void>;

  /** Return all `[key, record]` pairs in the table. Expired records are excluded. */
  entries<K extends keyof S>(table: K): Promise<Array<[KeyOf<S, K>, RecordOf<S, K>]>>;

  get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]>;

  /**
   * Fetch multiple records by key in a single operation.
   * Preserves input key order. Missing keys yield `undefined`.
   */
  getMany<K extends keyof S>(table: K, keys: KeyOf<S, K>[]): Promise<Array<RecordOf<S, K> | undefined>>;

  /**
   * Read-or-insert: returns the existing record if present, otherwise calls `defaultFn()`,
   * writes the result, and returns it.
   *
   * **Not atomic on memory and WebStorage adapters.** For guaranteed atomicity, wrap in
   * `batch(['table'], tx => tx.getOrDefault(...))` with the IndexedDB adapter.
   */
  getOrDefault<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    defaultFn: () => RecordOf<S, K>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K>>;

  has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;

  /** Returns `true` when the table has no live (non-expired) records. Equivalent to `(await count(table)) === 0`. */
  isEmpty<K extends keyof S>(table: K): Promise<boolean>;

  /**
   * Return all primary key values in the table. Without `filter`, uses a key-only backend path (no full records fetched).
   * With `filter`, fetches all records internally and applies the predicate before key extraction.
   * Expired records are excluded.
   */
  keys<K extends keyof S>(table: K, filter?: (record: RecordOf<S, K>) => boolean): Promise<KeyOf<S, K>[]>;

  /**
   * Subscribe to table changes. **Always fires immediately** with the current table state on
   * registration, then fires again on every subsequent mutation.
   * Returns an unsubscribe function — call it on teardown.
   *
   * Pass `{ signal }` to unsubscribe via an `AbortController` instead of — or in addition to —
   * calling the returned function.
   */
  observe<K extends keyof S>(
    table: K,
    listener: Observer<RecordOf<S, K>>,
    options?: {
      /** Skip the automatic initial snapshot. Defaults to `true` (fire immediately). */
      immediate?: boolean;
      signal?: AbortSignal;
    },
  ): Unsubscribe;

  /**
   * Subscribe to multiple tables at once. Fires a combined snapshot `{ [tableName]: records[] }`
   * once all tables have delivered their initial state, then fires again whenever any observed
   * table changes. Multiple tables mutated inside a single `batch()` coalesce into one callback.
   * Throws `VaultScopeError` when `tables` is empty.
   * Returns an `Unsubscribe` function — call it on teardown.
   */
  observeMany<K extends keyof S & string>(
    tables: readonly K[],
    listener: (snapshots: { [T in K]: RecordOf<S, T>[] }) => void,
    options?: {
      /**
       * When `true`, fires as soon as any table delivers its first snapshot.
       * Tables not yet resolved are represented as empty arrays.
       * Defaults to `false` (wait for all tables).
       */
      eager?: boolean;
      signal?: AbortSignal;
    },
  ): Unsubscribe;

  /**
   * Explicitly delete TTL-expired records from the specified tables (or all tables when
   * no filter is provided). Returns the count of records pruned per table.
   * Does not trigger observer callbacks. Invalidates the internal `count()` cache for pruned tables.
   */
  pruneExpired(tables?: readonly (keyof S & string)[]): Promise<{ [K in keyof S & string]: number }>;

  put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void>;
  putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void>;
  query<K extends keyof S>(table: K): QueryBuilder<RecordOf<S, K>>;

  /**
   * Merge `changes` into the existing record. Returns the merged record, or `undefined` when
   * the key does not exist — use `upsert` for insert-or-update semantics.
   */
  update<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    changes: Partial<RecordOf<S, K>>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K> | undefined>;

  /** Read-modify-write. `fn` receives the current record (or `undefined`) and returns the new record. */
  upsert<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    fn: (existing: RecordOf<S, K> | undefined) => RecordOf<S, K>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K>>;

  /**
   * Async iterable that yields a fresh snapshot on every table change, starting immediately.
   * The observer is cleaned up automatically when the loop exits.
   *
   * @param options.mode - `'latest'` (default) drops intermediate snapshots when the consumer
   *   lags. `'all'` queues every snapshot.
   * @param options.signal - An `AbortSignal` that stops the iteration from outside the loop.
   */
  watch<K extends keyof S>(
    table: K,
    options?: { mode?: 'all' | 'latest'; signal?: AbortSignal },
  ): AsyncIterable<RecordOf<S, K>[]>;
}
```

### `observe` behavior

`observe` **fires immediately** with the current table state on registration by default, then again on every subsequent mutation. Pass `{ immediate: false }` to skip the initial snapshot — useful when you already have the table state from a preceding `getAll()` call and only want change notifications.

| Option      | Type          | Default | Description                                                                                                                |
| ----------- | ------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `immediate` | `boolean`     | `true`  | When `false`, skips the automatic initial snapshot fired on registration.                                                  |
| `signal`    | `AbortSignal` | —       | When aborted, automatically unsubscribes the listener. Already-aborted signals are a no-op — no initial snapshot is fired. |

Returns an `Unsubscribe` function. Calling it and aborting the signal both cancel the observer — either approach works.

### `observeMany` behavior

`observeMany` populates the snapshot map immediately on registration. By default, the combined listener fires once all tables have reported their initial state. Set `eager: true` to fire as soon as any table delivers its first snapshot — tables not yet resolved appear as empty arrays. This is useful when some tables are large and you want to render partial data immediately.

Duplicate entries in the `tables` array are silently deduplicated. The combined snapshot will still include a key for each entry in the original array, but duplicate keys reference the same data.

| Option   | Type          | Default | Description                                                                                                     |
| -------- | ------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `eager`  | `boolean`     | `false` | When `true`, fires after the first table delivers its snapshot, using empty arrays for tables not yet resolved. |
| `signal` | `AbortSignal` | —       | When aborted, unsubscribes all underlying observers. Already-aborted signals return a no-op immediately.        |

### `watch` options

| Option   | Type                | Default    | Description                                                                                                                  |
| -------- | ------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `mode`   | `'latest' \| 'all'` | `'latest'` | Whether intermediate snapshots are dropped (`latest`) or queued (`all`) when the consumer lags                               |
| `signal` | `AbortSignal`       | —          | When aborted, terminates the iteration. If already aborted before the first `next()` call, the iterator is done immediately. |

> **Resource note:** The observer subscription is created eagerly on `[Symbol.asyncIterator]()` — not on the first `next()` call. This prevents mutations from being silently lost in the window between iterator creation and first consumption. Always `break`, `return`, or pass a `signal` to clean up the subscription; otherwise it remains active until the adapter is disposed.

## `toReadableStream`

```ts
function toReadableStream<T>(iterable: AsyncIterable<T>): ReadableStream<T>;
```

Converts an `AsyncIterable<T>` (such as `db.watch()`) into a Web Standard `ReadableStream<T>`. Use it when you need to pipe vault snapshots into a `WritableStream` or `TransformStream`.

```ts
import { toReadableStream } from '@vielzeug/vault';

const stream = toReadableStream(db.watch('users'));
await stream.pipeTo(new WritableStream({ write: (users) => render(users) }));
```

The stream closes when the iterable is exhausted or the stream is cancelled. Pass an `AbortSignal` to `db.watch()` to cancel from outside:

```ts
const controller = new AbortController();
const stream = toReadableStream(db.watch('users', { signal: controller.signal }));
controller.abort(); // closes the stream
```

## `isExpired`

```ts
function isExpired(expiresAt: number | undefined): boolean;
```

Returns `true` when an epoch-ms expiry timestamp has passed. Safe to call with `undefined` — returns `false`. Useful for custom codec implementations or TTL-aware utilities.

```ts
import { isExpired } from '@vielzeug/vault';

isExpired(undefined); // false
isExpired(Date.now() - 1000); // true
isExpired(Date.now() + 1000); // false
```

## TransactionContext

`TransactionContext<S, K>` is the type of the `tx` parameter inside `batch()` callbacks. It exposes the same CRUD methods as `Adapter` but restricts access to the tables declared in `batch(tables, fn)` — accessing any other table at runtime throws `VaultScopeError`.

```ts
type TransactionContext<S extends AnySchema, K extends keyof S & string = keyof S & string> = {
  // clear, count, delete, deleteMany, entries, get, getAll, getMany,
  // getOrDefault, has, isEmpty, keys, put, putAll, query, update, upsert
};
```

`batch()` scopes all operations to the tables declared in its first argument. Accessing any other table at runtime throws `VaultScopeError`. The first argument must not be empty.

## QueryBuilder

Queries are lazy pipelines. Operations accumulate until a terminal method is called.

`QueryBuilder<T, N>` carries two type parameters: `T` is the base record type, `N` is the progressively-narrowed type built up by `equals()` calls. The narrowed type flows through to `toArray()`, `first()`, `count()`, `totalCount()`, and `delete()`.

```ts
interface QueryBuilder<T extends Record<string, unknown>, N extends T = T> {
  // filter operators (chainable)
  filter(fn: (value: N) => boolean): QueryBuilder<T, N>;

  /**
   * Narrows the result type: `equals('role', 'admin')` returns
   * `QueryBuilder<T, N & { role: 'admin' }>`. Subsequent operators
   * and terminal calls reflect this constraint.
   */
  equals<K extends keyof T & string, V extends T[K]>(field: K, value: V): QueryBuilder<T & Record<K, V>>;

  /** Inclusive range filter. Preserves existing `N` narrowing. */
  between<K extends ComparableFieldKeys<T>>(
    field: K,
    lower: Extract<NonNullable<T[K]>, number | string>,
    upper: Extract<NonNullable<T[K]>, number | string>,
  ): QueryBuilder<T, N>;

  /** Prefix filter. Preserves existing `N` narrowing. */
  startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): QueryBuilder<T, N>;

  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T, N>;
  limit(n: number): QueryBuilder<T, N>;
  offset(n: number): QueryBuilder<T, N>;

  // terminal methods
  exists(): Promise<boolean>;
  toArray(): Promise<N[]>;
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
  first(): Promise<N | undefined>;
  delete(): Promise<number>;
}
```

### `exists()`

Returns `true` if at least one record matches all applied filter operations. Equivalent to `(await query.first()) !== undefined` but expresses the intent more clearly.

```ts
// check if any admin exists
const hasAdmin = await db.query('users').equals('role', 'admin').exists();

// check if table is non-empty
const hasPosts = await db.query('posts').exists();
```

Presentation-only ops (`limit`, `offset`, `orderBy`) are respected before checking. An empty table always returns `false`.

`delete()` returns the number of records removed. `between` and `orderBy` accept `number | string` fields.

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
  codec?: VaultCodec;
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
  recordCount: number; // live (non-expired) records
};

type DebugInfo<S extends AnySchema> = {
  tables: Array<{ name: keyof S & string } & DebugStats>;
};
```

### `VaultCodec`

Pluggable serialization contract. Implement to change how vault stores values at rest (e.g. compact keys, encryption, msgpack).

```ts
type VaultCodec = {
  /** Parse a raw stored value into `{ value, expiresAt? }`. Return `undefined` for corrupt data. */
  decode<T>(raw: unknown): { expiresAt?: number; value: T } | undefined;
  /** Encode a value and optional absolute expiry timestamp (epoch ms) into the storage format. */
  encode<T>(value: T, expiresAt?: number): unknown;
};
```

`defaultCodec` (exported) stores `{ value: T, expiresAt?: number }` verbatim — identical to the original behaviour. Use it as a reference or extend it:

```ts
import { defaultCodec, type VaultCodec } from '@vielzeug/vault';

const loggingCodec: VaultCodec = {
  decode: (raw) => {
    const result = defaultCodec.decode(raw);
    if (!result) console.warn('[vault] corrupt record:', raw);
    return result;
  },
  encode: defaultCodec.encode,
};
```

Pass `codec` to any factory:

```ts
const db = createLocalStorage({ name: 'app', schema, codec: loggingCodec });
```

### `createVersionedCodec`

```ts
function createVersionedCodec(versions: CodecVersion[], currentVersion: number): VaultCodec;
```

Creates a `VaultCodec` that prepends a `__v` version field to every encoded envelope. When decoding, the `__v` value selects the matching codec from `versions`. This allows safe codec upgrades: old records encoded with a previous codec continue to decode correctly as long as the old codec remains in `versions`.

```ts
import { createVersionedCodec, createMemory, table } from '@vielzeug/vault';

const v1Codec = {
  encode: (v) => ({ a: v }),
  decode: (r) => (r && typeof r === 'object' && 'a' in r ? { value: (r as { a: unknown }).a } : undefined),
};
const v2Codec = {
  encode: (v, e) => ({ b: v, e }),
  decode: (r) => (r && typeof r === 'object' && 'b' in r ? { value: (r as { b: unknown }).b } : undefined),
};

const codec = createVersionedCodec(
  [
    { version: 1, codec: v1Codec },
    { version: 2, codec: v2Codec },
  ],
  2, // write new records with version 2; read old version-1 records with v1Codec
);

const db = createMemory({ schema: { users: table<User>('id') }, codec });
```

Throws `VaultError` if:

- `versions` is empty
- any version number is not a non-negative integer
- version numbers are not unique
- `currentVersion` is not listed in `versions`

> **Migration note:** Records written by any other codec (including `defaultCodec`) lack the `__v` field and decode as `undefined`. Clear or migrate existing data before switching to a versioned codec.

### `CodecVersion`

```ts
type CodecVersion = {
  codec: VaultCodec;
  version: number; // non-negative integer, unique across the versions array
};
```

A single entry in the `versions` array passed to `createVersionedCodec`. `version` must be a non-negative integer.

### `TableBuilder`

Fluent builder returned by `table()`. Export this type to annotate schema entry variables without using `ReturnType<typeof table<T, K>>`.

```ts
import { type TableBuilder, table } from '@vielzeug/vault';

const entry: TableBuilder<User> = table<User>('id').index('email').ttl(ttl.minutes(30));
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
  /** Table name. For `batch` operations this is `'*'` because a batch may span multiple tables. */
  table: string;
};
```

### `QueryBuilder`

See the full signature in the [QueryBuilder section](#querybuilder) above.

## Errors

All errors thrown by `@vielzeug/vault` extend `VaultError`. Catch the base class for a catch-all, or catch specific subclasses for fine-grained handling.

```ts
import { VaultDisposedError, VaultError, VaultMigrationError, VaultQuotaError, VaultScopeError } from '@vielzeug/vault';
```

| Class                 | Extends      | Thrown when                                                                                |
| --------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| `VaultError`          | `Error`      | Base class — catch-all for any vault error                                                 |
| `VaultDisposedError`  | `VaultError` | Any operation after `dispose()` has been called                                            |
| `VaultScopeError`     | `VaultError` | `batch()` accesses a table outside its declared scope; empty array passed to `observeMany` |
| `VaultQuotaError`     | `VaultError` | A LocalStorage / SessionStorage write exceeds the storage quota                            |
| `VaultMigrationError` | `VaultError` | IndexedDB `onupgradeneeded` migration callback threw                                       |
