---
title: Deposit — API Reference
description: Complete API reference for Deposit adapters, schema helpers, query builder, and plugin types.
---

[[toc]]

## API At a Glance

| Symbol | Purpose |
| --- | --- |
| `table<T>(key)` | Create a typed schema entry |
| `ttl` | Duration helpers for TTL values |
| `createLocalStorage(opts)` | LocalStorage adapter |
| `createSessionStorage(opts)` | SessionStorage adapter |
| `createIndexedDB(opts)` | IndexedDB adapter with atomic batch |
| `createMemory(opts)` | In-memory adapter for tests and SSR |

## Package Entry Points

- `@vielzeug/deposit`

## Exports

**Values:** `createLocalStorage`, `createSessionStorage`, `createIndexedDB`, `createMemory`, `table`, `ttl`

**Types:** `Adapter`, `AnySchema`, `DebugInfo`, `DebugStats`, `DepositLogger`, `KeyOf`, `MetricsEvent`, `MigrationContext`, `MigrationFn`, `Observer`, `QueryBuilder`, `ReadQuery`, `RecordOf`, `RecordParser`, `TableValidators`, `TransactionContext`, `TtlMs`

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
import { table, ttl } from '@vielzeug/deposit';

const schema = {
  sessions: table<Session>('id').ttl(ttl.minutes(30)),
};
```

The TypeScript compiler will reject keys that do not exist on `T`, and downstream operations (`get`, `delete`, `has`, `upsert`) accept only the correct key type.

---

## TTL Helper

```ts
import { ttl, type TtlMs } from '@vielzeug/deposit';

ttl.ms(n: number): TtlMs
ttl.seconds(n: number): TtlMs
ttl.minutes(n: number): TtlMs
ttl.hours(n: number): TtlMs
ttl.days(n: number): TtlMs
```

`TtlMs` is a branded `number` type. Raw numeric literals are rejected by the type checker — always use these helpers.

All helpers throw synchronously if `n` is not a finite non-negative number. Passing an invalid `TtlMs` value directly to a write method also throws.

---

## Factories

All four factories accept the same optional plugin options and return `Adapter<S>`.

### `createLocalStorage`

```ts
createLocalStorage<S extends AnySchema>(options: {
  logger?: DepositLogger;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  validators?: TableValidators<S>;
}): Adapter<S>
```

### `createSessionStorage`

```ts
createSessionStorage<S extends AnySchema>(options: {
  logger?: DepositLogger;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  validators?: TableValidators<S>;
}): Adapter<S>
```

### `createIndexedDB`

```ts
createIndexedDB<S extends AnySchema>(options: {
  logger?: DepositLogger;
  migrate?: MigrationFn;
  name: string;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  validators?: TableValidators<S>;
  version: number;
}): Adapter<S>
```

The IDB adapter opens the database lazily on first operation. `migrate` is called during `onupgradeneeded` when `version` is higher than the stored version. The adapter also opens a `BroadcastChannel` (when available) so observer notifications propagate across tabs.

### `createMemory`

```ts
createMemory<S extends AnySchema>(options: {
  logger?: DepositLogger;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  validators?: TableValidators<S>;
}): Adapter<S>
```

---

## Adapter Interface

```ts
interface Adapter<S extends AnySchema> {
  /** Multi-table write with deferred notifications. Atomic on IndexedDB. */
  batch<K extends keyof S, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
  ): Promise<R>;

  /** Count of live (non-expired) records. */
  count<K extends keyof S>(table: K): Promise<number>;

  /** Live vs expired record counts per table. For development use. */
  debug(): Promise<DebugInfo<S>>;

  delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;

  /** Remove all records. */
  clear<K extends keyof S>(table: K): Promise<void>;

  /** Release all resources (observers, channel, DB connection). */
  dispose(): void;

  get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]>;
  has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;

  /** Lazy async iteration over all live records. */
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

  /** Read-modify-write. `fn` receives the current record (or undefined) and returns the new record. */
  upsert<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    fn: (existing: RecordOf<S, K> | undefined) => RecordOf<S, K>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K>>;
}
```

### `observe` options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `immediate` | `boolean` | `true` | Fire the listener immediately with the current table contents |

Returns an unsubscribe function. Call it on teardown to prevent memory leaks.

---

## TransactionContext

Available inside `batch()` callbacks.

```ts
type TransactionContext<S extends AnySchema, K extends keyof S = keyof S> = {
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  clear<T extends K>(table: T): Promise<void>;
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
```

`batch()` is scoped to the tables listed in the first argument. Operations on unlisted tables are rejected by the type system.

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
  count(): Promise<number>;
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

## Debug

```ts
type DebugStats = {
  expiredCount: number; // TTL-expired records not yet evicted
  recordCount: number;  // live (non-expired) records
};

type DebugInfo<S extends AnySchema> = {
  tables: Array<{ name: keyof S & string } & DebugStats>;
};
```

---

## Plugin Types

### `DepositLogger`

A narrow logger interface satisfied structurally by `@vielzeug/logit` Logger.

```ts
interface DepositLogger {
  debug(msgOrCtx: Record<string, unknown> | string, message?: string): void;
  error(msgOrCtxOrErr: Record<string, unknown> | Error | string, message?: string): void;
  warn(msgOrCtx: Record<string, unknown> | string, message?: string): void;
}
```

Pass a logit Logger instance directly — no adapter needed.

### `RecordParser` / `TableValidators`

```ts
interface RecordParser<T> {
  parseSync(value: unknown): T;
}

type TableValidators<S extends AnySchema> = {
  [K in keyof S]?: RecordParser<RecordOf<S, K>>;
};
```

A `@vielzeug/validit` schema satisfies `RecordParser` directly. Any object with `parseSync` works, including a thin Zod shim. Validators run before every `put`, `putAll`, `update`, and `upsert`.

### `MetricsEvent`

```ts
type MetricsEvent = {
  duration: number;
  operation:
    | 'batch' | 'count' | 'delete' | 'clear' | 'get' | 'getAll'
    | 'has' | 'iterate' | 'put' | 'putAll' | 'query' | 'queryDelete'
    | 'update' | 'upsert';
  table: string;
};
```

---

## Utility Types

```ts
/** Extract the record type for a given table. */
type RecordOf<S extends AnySchema, K extends keyof S> = ...;

/** Extract the primary-key value type for a given table. */
type KeyOf<S extends AnySchema, K extends keyof S> = ...;

/** Observer callback type. */
type Observer<T> = (records: T[]) => void;
```
