---
title: Deposit — API Reference
description: Minimal API reference for deposit.
---

[[toc]]

## Package Entry Points

- `@vielzeug/deposit`

## Exports

- `createLocalStorage`
- `createIndexedDB`
- `QueryBuilder`
- `ttl`
- Types: `Schema`, `SchemaEntry`, `Adapter`, `IndexedDBHandle`, `TransactionContext`, `RecordOf`, `KeyOf`, `MigrationContext`, `MigrationFn`

## Core Types

### SchemaEntry

```ts
type SchemaEntry<T extends Record<string, unknown>> = {
  readonly _type?: T;
  key: keyof T & string;
};
```

### Schema

```ts
type Schema<S extends Record<string, Record<string, unknown>>> = {
  [K in keyof S]: { key: keyof S[K] & string };
};
```

### RecordOf and KeyOf

```ts
type RecordOf<S extends Schema<any>, K extends keyof S> = NonNullable<S[K]['_type']>;
type KeyOf<S extends Schema<any>, K extends keyof S> = /* key field value type */;
```

Example:

```ts
type User = { id: number; name: string };

const schema: Schema<{ users: User }> = {
  users: { key: 'id' },
};
```

## Factories

### createLocalStorage

```ts
createLocalStorage<S extends Schema<any>>(options: {
  dbName: string;
  schema: S;
}): Adapter<S>
```

### createIndexedDB

```ts
createIndexedDB<S extends Schema<any>>(options: {
  dbName: string;
  schema: S;
  version: number;
  migrationFn?: (ctx: { db: IDBDatabase; oldVersion: number; newVersion: number | null; tx: IDBTransaction }) => void;
}): IndexedDBHandle<S>
```

`migrationFn` runs during IDB upgrade (`onupgradeneeded`) before deposit ensures declared object stores exist.

## Adapter Interface

```ts
interface Adapter<S extends Schema<any>> {
  get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]>;
  put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void>;
  delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void>;
  deleteAll<K extends keyof S>(table: K): Promise<void>;
  count<K extends keyof S>(table: K): Promise<number>;
  from<K extends keyof S>(table: K): QueryBuilder<RecordOf<S, K>>;
}
```

## IndexedDBHandle

```ts
interface IndexedDBHandle<S extends Schema<any>> extends Adapter<S> {
  transaction<K extends keyof S>(
    tables: K[],
    fn: (tx: TransactionContext<S, K>) => Promise<void>,
  ): Promise<void>;
  close(): void;
}
```

## TransactionContext

```ts
type TransactionContext<S extends Schema<any>, K extends keyof S> = {
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: number): Promise<void>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<void>;
  deleteAll<T extends K>(table: T): Promise<void>;
  count<T extends K>(table: T): Promise<number>;
  from<T extends K>(table: T): QueryBuilder<RecordOf<S, T>>;
};
```

This context only exposes core methods and is scoped to the current transaction.

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
}
```

## TTL Helper

```ts
const ttl = {
  ms(n: number): number,
  seconds(n: number): number,
  minutes(n: number): number,
  hours(n: number): number,
  days(n: number): number,
}
```

Use TTL by passing one of these values as the third argument to `put(table, value, ttl)`.
