---
title: Deposit — API Reference
description: Complete API reference for Deposit adapters, transactions, and query builder.
---

[[toc]]

## API At a Glance

| Symbol | Purpose |
| --- | --- |
| `createLocalStorage({ name, schema })` | Local browser storage adapter |
| `createSessionStorage({ name, schema })` | Tab-scoped browser storage adapter |
| `createIndexedDB({ name, schema, version, migrate? })` | IndexedDB adapter with transactions |
| `createMemory({ schema })` | In-memory adapter for tests and SSR |
| `table<T>(key)` | Creates a typed schema entry |
| `query(table)` | Build chainable query pipelines |

## Package Entry Points

- `@vielzeug/deposit`

## Exports

- `createLocalStorage`
- `createSessionStorage`
- `createIndexedDB`
- `createMemory`
- `QueryBuilder`
- `table`
- `ttl`
- Types: `Adapter`, `IndexedDBHandle`, `TransactionContext`, `RecordOf`, `KeyOf`, `MigrationContext`, `MigrationFn`, `Observer`, `TtlMs`

## Schema Helper

### `table`

```ts
table<T extends Record<string, unknown>>(key: keyof T & string)
```

```ts
type User = { id: number; name: string };

const schema = {
  users: table<User>('id'),
};
```

## Factories

### `createLocalStorage`

```ts
createLocalStorage<S>(options: { name: string; schema: S }): Adapter<S>
```

### `createSessionStorage`

```ts
createSessionStorage<S>(options: { name: string; schema: S }): Adapter<S>
```

### `createIndexedDB`

```ts
createIndexedDB<S>(options: {
  name: string;
  schema: S;
  version: number;
  migrate?: (ctx: {
    db: IDBDatabase;
    oldVersion: number;
    newVersion: number | null;
    tx: IDBTransaction;
  }) => void;
}): IndexedDBHandle<S>
```

### `createMemory`

```ts
createMemory<S>(options: { schema: S }): Adapter<S>
```

## Adapter Interface

```ts
interface Adapter<S> {
  get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]>;
  has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void>;
  putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void>;
  update<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    changes: Partial<RecordOf<S, K>>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K> | undefined>;
  delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  deleteAll<K extends keyof S>(table: K): Promise<number>;
  query<K extends keyof S>(table: K): QueryBuilder<RecordOf<S, K>>;
  observe<K extends keyof S>(
    table: K,
    listener: (value: RecordOf<S, K>[]) => void,
    options?: { initialEmit?: boolean },
  ): () => void;
  dispose(): void;
}
```

## IndexedDBHandle

```ts
interface IndexedDBHandle<S> extends Adapter<S> {
  transaction<K extends keyof S, R>(tables: readonly K[], fn: (tx: TransactionContext<S, K>) => Promise<R>): Promise<R>;
}
```

## TransactionContext

```ts
type TransactionContext<S, K extends keyof S> = {
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: TtlMs): Promise<void>;
  update<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    changes: Partial<RecordOf<S, T>>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, T> | undefined>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  deleteAll<T extends K>(table: T): Promise<number>;
  query<T extends K>(table: T): QueryBuilder<RecordOf<S, T>>;
};
```

## QueryBuilder

```ts
class QueryBuilder<T extends Record<string, unknown>> {
  filter(fn: (value: T, index: number, array: T[]) => boolean): QueryBuilder<T>;
  equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T>;
  between<K extends keyof T>(
    field: K,
    lower: Extract<NonNullable<T[K]>, number | string>,
    upper: Extract<NonNullable<T[K]>, number | string>,
  ): QueryBuilder<T>;
  startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): QueryBuilder<T>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
  limit(n: number): QueryBuilder<T>;
  offset(n: number): QueryBuilder<T>;
  toArray(): Promise<T[]>;
  count(): Promise<number>;
  first(): Promise<T | undefined>;
  delete(): Promise<number>;
}
```

Query pipelines are lazy and execute only on terminal methods (`toArray`, `count`, `first`, `delete`).

## TTL Helper

```ts
type TtlMs = number;

const ttl = {
  ms(n: number): TtlMs;
  seconds(n: number): TtlMs;
  minutes(n: number): TtlMs;
  hours(n: number): TtlMs;
  days(n: number): TtlMs;
};
```

Validation rules:

- All TTL helper inputs must be finite and non-negative.
- Invalid TTL input throws synchronously from `ttl.*(...)`.
- Passing an invalid `ttl` value directly to write methods also throws.
