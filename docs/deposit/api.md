---
title: Deposit — API Reference
description: Complete API reference for the Deposit browser storage library.
---

# Deposit API Reference

[[toc]]

## Factory Functions

### `defineSchema(schema)`

Creates a fully-typed schema definition. The type parameter `S` maps table names to record types.

**Signature:**

```ts
function defineSchema<S extends Record<string, Record<string, unknown>>>(
  schema: { [K in keyof S]: { key: keyof S[K] & string; indexes?: (keyof S[K] & string)[] } },
): Schema<S>
```

**Example:**

```ts
const schema = defineSchema<{ users: User; posts: Post }>({
  users: { key: 'id', indexes: ['name', 'age'] },
  posts: { key: 'id', indexes: ['authorId'] },
});
```

---

### `createLocalStorage(options)`

Creates a LocalStorage-backed adapter.

**Signature:**

```ts
function createLocalStorage<S extends Record<string, Record<string, unknown>>>(
  options: LocalStorageOptions<S>,
): Adapter<Schema<S>>
```

**Options — `LocalStorageOptions<S>`:**

| Property | Type | Description |
|---|---|---|
| `dbName` | `string` | Namespace prefix for all localStorage keys |
| `schema` | `Schema<S>` | Table definitions |
| `logger?` | `Logger` | Custom logger; defaults to `console` |

---

### `storeField(field)`

Returns the IDB key path for a given record field, accounting for deposit's internal envelope format.
Use this inside `migrationFn` when creating indexes or object stores to stay decoupled from deposit's storage internals.

**Signature:**

```ts
function storeField(field: string): string
// storeField('email') === 'v.email'
```

**Example:**

```ts
import { storeField } from '@vielzeug/deposit';

const migrationFn: MigrationFn = (db, oldVersion, _newVersion, tx) => {
  if (oldVersion < 2) {
    tx.objectStore('users').createIndex('email', storeField('email'), { unique: true });
  }
};
```

---

### `createIndexedDB(options)`

Creates an IndexedDB-backed adapter. The database connection is opened lazily on the first operation.

**Signature:**

```ts
function createIndexedDB<S extends Record<string, Record<string, unknown>>>(
  options: IndexedDBOptions<S>,
): IndexedDBHandle<Schema<S>>
```

**Options — `IndexedDBOptions<S>`:**

| Property | Type | Description |
|---|---|---|
| `dbName` | `string` | IDB database name |
| `version?` | `number` | Database version (default: `1`) |
| `schema` | `Schema<S>` | Table definitions |
| `migrationFn?` | `MigrationFn` | Called inside `onupgradeneeded` on version upgrade |
| `logger?` | `Logger` | Custom logger; defaults to `console` |

## Adapter Interface

`Adapter<S>` is the common interface implemented by both adapters.

### `get(table, key, defaultValue?)`

Returns the record for the given primary key, or `defaultValue` / `undefined` when absent or expired.

**Overloads:**

```ts
get<K extends keyof S>(table: K, key: KeyType<S, K>, defaultValue: RecordType<S, K>): Promise<RecordType<S, K>>;
get<K extends keyof S>(table: K, key: KeyType<S, K>, defaultValue?: RecordType<S, K>): Promise<RecordType<S, K> | undefined>;
```

When `defaultValue` is supplied the return type narrows to `RecordType<S, K>` (never `undefined`).

---

### `getAll(table)`

Returns all live (non-expired) records. The IndexedDB adapter asynchronously evicts expired entries from the store after returning.

```ts
getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]>
```

---

### `getMany(table, keys[])`

Batch fetch by a list of primary keys. Missing or expired records are omitted from the result.

```ts
getMany<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<RecordType<S, K>[]>
```

---

### `put(table, value, ttl?)`

Upserts one record or an array of records. `ttl` is the time-to-live in milliseconds.

```ts
put<K extends keyof S>(table: K, value: RecordType<S, K> | RecordType<S, K>[], ttl?: number): Promise<void>
```

---

### `patch(table, key, partial)`

Merges `partial` into the existing record and returns the result. Returns `undefined` when the key is absent or expired. TTL is preserved.

```ts
patch<K extends keyof S>(
  table: K,
  key: KeyType<S, K>,
  partial: Partial<RecordType<S, K>>,
): Promise<RecordType<S, K> | undefined>
```

---

### `delete(table, key)`

Removes one or many records. Silently ignores missing keys.

```ts
delete<K extends keyof S>(table: K, key: KeyType<S, K> | KeyType<S, K>[]): Promise<void>
```

---

### `deleteAll(table)`

Removes all records in the given table.

```ts
deleteAll<K extends keyof S>(table: K): Promise<void>
```

---

### `has(table, key)`

Returns `true` when a live record exists for the given key. Respects TTL.

```ts
has<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<boolean>
```

---

### `count(table)`

Counts live (non-expired) records in the given table.

> **Note:** Both adapters scan all records to exclude TTL-expired entries — O(n). For very large tables, prefer fetching only the data you need.

```ts
count<K extends keyof S>(table: K): Promise<number>
```

---

### `getOrPut(table, key, factory, ttl?)`

Returns the cached record when present; otherwise calls `factory()`, stores the result with optional TTL, and returns it.

```ts
getOrPut<K extends keyof S>(
  table: K,
  key: KeyType<S, K>,
  factory: () => RecordType<S, K> | Promise<RecordType<S, K>>,
  ttl?: number,
): Promise<RecordType<S, K>>
```

---

### `from(table)`

Creates a lazy `QueryBuilder<T>`. No query runs until a terminal method is called.

```ts
from<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>>
```

## IndexedDBHandle

`IndexedDBHandle<S>` extends `Adapter<S>` with two additional members.

### `transaction(tables, fn)`

Runs `fn` inside a single `readwrite` IDB transaction spanning all listed tables. All writes commit atomically — if `fn` throws, the transaction is aborted and nothing is persisted.

```ts
transaction<K extends keyof S>(
  tables: K[],
  fn: (tx: TransactionContext<S, K>) => Promise<void>,
): Promise<void>
```

**`TransactionContext<S, K>` methods:**

| Method | Description |
|---|---|
| `get(table, key)` | Read a record inside the transaction |
| `getAll(table)` | Read all live records inside the transaction |
| `put(table, value, ttl?)` | Write or upsert a record |
| `patch(table, key, partial)` | Partial update — returns merged record or `undefined` |
| `delete(table, key)` | Delete a record |

> **Note:** `getMany`, `count`, `has`, `getOrPut`, and `from` are intentionally absent — they are not supported within an IDB transaction scope.

---

### `close()`

Closes the underlying `IDBDatabase` connection and resets internal state.

```ts
close(): void
```

## QueryBuilder

`QueryBuilder<T>` is an immutable, lazy pipeline. Each method returns a new instance.

### Filtering

#### `equals(field, value)`

```ts
equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T>
```

Strict equality filter (`===`).

---

#### `between(field, lower, upper)`

```ts
between<K extends keyof T>(
  field: K,
  lower: T[K] extends number | string ? T[K] : never,
  upper: T[K] extends number | string ? T[K] : never,
): QueryBuilder<T>
```

Inclusive range filter. The bound types are inferred from the field type, so passing a `string` bound for a `number` field is a compile-time error.

---

#### `startsWith(field, prefix, ignoreCase?)`

```ts
startsWith<K extends keyof T>(field: K, prefix: string, ignoreCase?: boolean): QueryBuilder<T>
```

Filters string fields that start with `prefix`. Case-sensitive by default.

---

#### `filter(fn)`

```ts
filter(fn: Predicate<T>): QueryBuilder<T>
```

Filters using a custom predicate.

---

#### `and(...predicates)`

```ts
and(...predicates: Predicate<T>[]): QueryBuilder<T>
```

Keeps records that satisfy **all** predicates.

---

#### `or(...predicates)`

```ts
or(...predicates: Predicate<T>[]): QueryBuilder<T>
```

Keeps records that satisfy **at least one** predicate.

---

### Sorting & Pagination

#### `orderBy(field, direction?)`

```ts
orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>
```

Sorts by `field`. Default direction is `'asc'`.

---

#### `limit(n)`

```ts
limit(n: number): QueryBuilder<T>
```

Takes the first `n` records.

---

#### `offset(n)`

```ts
offset(n: number): QueryBuilder<T>
```

Skips the first `n` records.

---

#### `page(pageNumber, pageSize)`

```ts
page(pageNumber: number, pageSize: number): QueryBuilder<T>
```

Slices by 1-based page number. `page(2, 10)` returns records 11–20.

---

#### `reverse()`

```ts
reverse(): QueryBuilder<T>
```

Reverses the order of the result.

---

### Transformation

#### `map(callback)`

```ts
map<U>(callback: (record: T) => U): ProjectedQuery<U>
```

Transforms each record to a new value. Returns a `ProjectedQuery<U>` rather than `QueryBuilder<U>` — `U` is unconstrained, so primitive projections like `map(u => u.name)` work correctly. `ProjectedQuery<U>` exposes the same terminal methods (`toArray`, `first`, `last`, `count`, `[Symbol.asyncIterator]`) but is not further chainable.

```ts
const names = await db.from('users').map(u => u.name).toArray();          // string[]
const dtos  = await db.from('users').map(u => ({ id: u.id })).toArray();  // { id: number }[]
```

---

#### `search(query, tone?)`

```ts
search(query: string, tone?: number): QueryBuilder<T>
```

Fuzzy full-text search across all fields, powered by `@vielzeug/toolkit`.
`tone` controls the match threshold in the range `[0, 1]` — lower values are more permissive. Defaults to `0.25`.

---

#### `contains(query, fields?)`

```ts
contains(query: string, fields?: (keyof T & string)[]): QueryBuilder<T>
```

Case-insensitive substring match. When `fields` is omitted, all string-valued fields are checked.

---

### Terminals

#### `toArray()`

```ts
toArray(): Promise<T[]>
```

Executes the pipeline and returns all results.

---

#### `first()`

```ts
first(): Promise<T | undefined>
```

Executes the pipeline and returns the first result.

---

#### `last()`

```ts
last(): Promise<T | undefined>
```

Executes the pipeline and returns the last result.

---

#### `count()`

```ts
count(): Promise<number>
```

Executes the pipeline and returns the count of matching records.

> **Note:** `limit`, `offset`, and `page` are applied before counting. Call `count()` before adding pagination operators if you need the total match count.

---

#### `[Symbol.asyncIterator]()`

```ts
[Symbol.asyncIterator](): AsyncGenerator<T>
```

Enables `for await...of` iteration.

```ts
for await (const record of db.from('users').orderBy('name')) {
  process(record);
}
```

## Types

### `ProjectedQuery<U>`

The return type of `QueryBuilder.map()`. Exposes terminal methods only — it is not chainable with further query operators.

```ts
class ProjectedQuery<U> {
  toArray(): Promise<U[]>
  first(): Promise<U | undefined>
  last(): Promise<U | undefined>
  count(): Promise<number>
  [Symbol.asyncIterator](): AsyncGenerator<U>
}
```

---

### `Schema<S>`

Use `defineSchema<S>(schema)` rather than constructing this type directly.

```ts
type Schema<S = Record<string, Record<string, unknown>>> = {
  [K in keyof S]: {
    key: keyof S[K] & string;
    indexes?: (keyof S[K] & string)[];
  };
}
```

---

### `MigrationFn`

```ts
type MigrationFn = (
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBTransaction,
) => void | Promise<void>
```

Provide to `createIndexedDB` to handle schema migrations across database versions.

---

### `LocalStorageOptions<S>`

```ts
type LocalStorageOptions<S extends Record<string, Record<string, unknown>>> = {
  dbName: string;
  schema: Schema<S>;
  logger?: Logger;
}
```

---

### `IndexedDBOptions<S>`

```ts
type IndexedDBOptions<S extends Record<string, Record<string, unknown>>> = {
  dbName: string;
  version?: number;
  schema: Schema<S>;
  migrationFn?: MigrationFn;
  logger?: Logger;
}
```

---

### `TransactionContext<S, K>`

```ts
type TransactionContext<S extends Schema, K extends keyof S> = {
  get<T extends K>(table: T, key: KeyType<S, T>): Promise<RecordType<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordType<S, T>[]>;
  put<T extends K>(table: T, value: RecordType<S, T>, ttl?: number): Promise<void>;
  delete<T extends K>(table: T, key: KeyType<S, T>): Promise<void>;
  patch<T extends K>(table: T, key: KeyType<S, T>, partial: Partial<RecordType<S, T>>): Promise<RecordType<S, T> | undefined>;
}
```

---

### `Logger`

```ts
type Logger = {
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
}
```

Pass a custom logger to `createLocalStorage` or `createIndexedDB` to redirect internal warnings. Defaults to `console`.
