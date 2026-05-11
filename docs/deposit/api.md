---
title: Deposit — API Reference
description: Complete API reference for the Deposit browser storage adapters and query builder.
---

# Deposit API Reference

[[toc]]

## API At a Glance

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createLocalStorage()` | Local browser storage adapter | Sync factory, async methods | Requires `localStorage` availability |
| `createSessionStorage()` | Tab-scoped browser storage adapter | Sync factory, async methods | Requires `sessionStorage` availability |
| `createCookie()` | Cookie-backed browser storage adapter | Sync factory, async methods | Requires `document` and is browser-only |
| `createIndexedDB()` | IndexedDB adapter with transactions | Sync factory, async methods | `schemaVersion` must increase to run migrations |
| `createMemory()` | In-memory adapter for tests and SSR | Sync factory, async methods | State is scoped to the instance; not persisted |
| `table<T>(key)` | Creates a typed schema entry | Sync | — |
| `query(table)` | Build chainable in-memory queries | Async execution | Filters run over fetched records |

## Package Entry Points

- `@vielzeug/deposit`

## Exports

- `createLocalStorage`
- `createSessionStorage`
- `createCookie`
- `createIndexedDB`
- `createMemory`
- `QueryBuilder`
- `table`
- `ttl`
- Types: `Adapter`, `IndexedDBHandle`, `TransactionContext`, `RecordOf`, `KeyOf`, `MigrationContext`, `MigrationFn`, `Observer`

## Core Types

### RecordOf and KeyOf

```ts
type RecordOf<S, K extends keyof S> = /* record type for table K */;
type KeyOf<S, K extends keyof S> = /* key value type for table K */;
```

Example:

```ts
type User = { id: number; name: string };

const schema = {
  users: table<User>('id'),
};

type UserRecord = RecordOf<typeof schema, 'users'>; // User
type UserKey = KeyOf<typeof schema, 'users'>; // number
```

## Schema Helper

### table

```ts
table<T extends Record<string, unknown>>(key: keyof T & string)
```

Creates a typed schema entry. The generic `T` carries the record type; `key` is the primary key field.

```ts
const schema = {
  users: table<User>('id'),
  posts: table<Post>('id'),
};

// typeof schema inferred — no Schema<{...}> annotation needed
type UserRecord = RecordOf<typeof schema, 'users'>; // User
type UserKey   = KeyOf<typeof schema, 'users'>;    // number
```

## Factories

### createLocalStorage

```ts
createLocalStorage<S>(options: {
  dbName: string;
  schema: S;
}): Adapter<S>
```

Creates a LocalStorage-backed adapter.

### createSessionStorage

```ts
createSessionStorage<S>(options: {
  dbName: string;
  schema: S;
}): Adapter<S>
```

Creates a SessionStorage-backed adapter.

### createCookie

```ts
createCookie<S>(options: {
  dbName: string;
  schema: S;
  path?: string;
  sameSite?: 'Lax' | 'None' | 'Strict';
  secure?: boolean;
}): Adapter<S>
```

Creates a cookie-backed adapter for browser environments.

Records are stored under cookie names derived from the database, table, and record key. TTL is encoded in the stored payload and also mapped to cookie `Max-Age` when provided.

Cookie options:

- `path` defaults to `'/'`
- `sameSite` defaults to `'Strict'`
- `secure` defaults to `false`

### createIndexedDB

```ts
createIndexedDB<S>(options: {
  dbName: string;
  schema: S;
  schemaVersion: number;
  migrate?: (ctx: {
    db: IDBDatabase;
    oldVersion: number;
    newVersion: number | null;
    tx: IDBTransaction;
  }) => void;
}): IndexedDBHandle<S>
```

Creates an IndexedDB-backed adapter with transactions and migration support.

`migrate` runs during IDB upgrade (`onupgradeneeded`) before deposit ensures declared object stores exist.

### createMemory

```ts
createMemory<S>(options: {
  schema: S;
}): Adapter<S>
```

Creates an in-memory adapter backed by a `Map`. No `dbName` required; each call returns an isolated instance.

The memory adapter fully implements `Adapter<S>` including TTL: expired records are removed lazily on read, identical to the other adapters. Use this in tests and server-side rendering environments.

## Migration Types

```ts
type MigrationContext = {
  db: IDBDatabase;
  newVersion: number | null;
  oldVersion: number;
  tx: IDBTransaction;
};

type MigrationFn = (ctx: MigrationContext) => void;
```

## Adapter Interface

```ts
interface Adapter<S> {
  get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]>;
  forEach<K extends keyof S>(table: K, fn: (value: RecordOf<S, K>) => void | Promise<void>): Promise<void>;
  has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  getOrPut<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    fallback: RecordOf<S, K> | (() => RecordOf<S, K>),
    ttl?: number,
  ): Promise<RecordOf<S, K>>;
  put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void>;
  putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: number): Promise<void>;
  update<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    changes: Partial<RecordOf<S, K>>,
    ttl?: number,
  ): Promise<RecordOf<S, K> | undefined>;
  delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void>;
  deleteWhere<K extends keyof S>(table: K, predicate: (value: RecordOf<S, K>) => boolean): Promise<number>;
  deleteAll<K extends keyof S>(table: K): Promise<void>;
  count<K extends keyof S>(table: K): Promise<number>;
  query<K extends keyof S>(table: K): QueryBuilder<RecordOf<S, K>>;
  observe<K extends keyof S>(table: K, listener: (rows: RecordOf<S, K>[]) => void): () => void;
}
```

The common adapter contract shared by all Deposit adapters.

## IndexedDBHandle

```ts
interface IndexedDBHandle<S> extends Adapter<S> {
  transaction<K extends keyof S, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
  ): Promise<R>;
  close(): void;
}
```

Extends `Adapter` with transaction support and explicit lifecycle cleanup via `close()`.

## TransactionContext

```ts
type TransactionContext<S, K extends keyof S> = {
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  forEach<T extends K>(table: T, fn: (value: RecordOf<S, T>) => void | Promise<void>): Promise<void>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  getOrPut<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    fallback: RecordOf<S, T> | (() => RecordOf<S, T>),
    ttl?: number,
  ): Promise<RecordOf<S, T>>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: number): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: number): Promise<void>;
  update<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    changes: Partial<RecordOf<S, T>>,
    ttl?: number,
  ): Promise<RecordOf<S, T> | undefined>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<void>;
  deleteWhere<T extends K>(table: T, predicate: (value: RecordOf<S, T>) => boolean): Promise<number>;
  deleteAll<T extends K>(table: T): Promise<void>;
  count<T extends K>(table: T): Promise<number>;
  query<T extends K>(table: T): QueryBuilder<RecordOf<S, T>>;
};
```

This context mirrors adapter methods and is scoped to the current transaction.

## QueryBuilder

```ts
class QueryBuilder<T extends Record<string, unknown>> {
  filter(fn: (value: T, index: number, array: T[]) => boolean): QueryBuilder<T>;
  equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T>;
  between<K extends keyof T>(field: K, lower: T[K], upper: T[K]): QueryBuilder<T>;
  startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): QueryBuilder<T>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
  limit(n: number): QueryBuilder<T>;
  offset(n: number): QueryBuilder<T>;
  toArray(): Promise<T[]>;
  count(): Promise<number>;
  first(): Promise<T | undefined>;
}
```

Query pipelines are lazy and execute only on `toArray()` / `count()` / `first()`.

## TTL Helper

```ts
const ttl = {
  ms(n: number): number;
  seconds(n: number): number;
  minutes(n: number): number;
  hours(n: number): number;
  days(n: number): number;
}
```

Use TTL by passing one of these values as the third argument to `put(table, value, ttl)`.

## Error Behavior

- `createLocalStorage` methods throw when browser storage is unavailable.
- `createSessionStorage` methods throw when browser storage is unavailable.
- LocalStorage/SessionStorage writes throw on quota exceed (`QuotaExceededError`) with a descriptive message.
- IndexedDB open/transaction failures throw adapter-scoped errors with `cause` attached when available.
