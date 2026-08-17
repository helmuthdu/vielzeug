---
title: Vault — API Reference
description: Reference for Vault schemas, adapter entry points, storage capabilities, SQLite drivers, and errors.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createMemory()` | In-memory portable store | Async API | Import from `/memory` |
| `createLocalStorage()` / `createSessionStorage()` | Web Storage-backed portable stores | Async API | Available only where the corresponding Web API exists |
| `createIndexedDB()` | Browser transactions and cursor iteration | Async API | Import from `/indexeddb` |
| `createSQLite()` | Driver-neutral SQLite store | Async API over a synchronous driver | Import from `/sqlite` |
| `table()` | Typed record schema | Sync | The key field must be a string or finite number |
| `ttl` | Valid expiration durations | Sync | Durations must be positive |
| `scheduleExpiredPrune()` | Periodic TTL cleanup | Sync setup, async work | Pass `disposalSignal` to auto-cancel |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/vault` | Adapter-free schemas, TTL, errors, pruning, queries, and shared types |
| `@vielzeug/vault/memory` | `createMemory` |
| `@vielzeug/vault/local-storage` | `createLocalStorage` |
| `@vielzeug/vault/session-storage` | `createSessionStorage` |
| `@vielzeug/vault/indexeddb` | `createIndexedDB`, `defineMigration`, migrations, and IndexedDB-only types |
| `@vielzeug/vault/sqlite` | `createSQLite`, the SQLite driver protocol types, and `TransactionContext` |

## Schemas and TTL

### `table()`

```ts
function table<T extends object, Key extends keyof T & string = keyof T & string>(
  key: Key & (T[Key] extends VaultKey ? unknown : never),
  options?: { defaultTtl?: number; indexes?: readonly (keyof T & string)[] },
): SchemaEntry<T, Key>;
```

Defines a typed table and its primary-key field.

| Parameter | Description |
| --- | --- |
| `key` | A record field whose values are `string` or finite `number` keys |
| `options.defaultTtl` | Per-table default TTL in milliseconds |
| `options.indexes` | IndexedDB secondary index fields |

**Returns:** A `SchemaEntry` describing the table.

```ts
import { table, ttl } from '@vielzeug/vault';

const users = table<{ id: number; email: string }>('id', {
  indexes: ['email'],
  defaultTtl: ttl.days(7),
});
```

---

### `ttl`

```ts
const ttl: {
  days(n: number): number;
  hours(n: number): number;
  minutes(n: number): number;
  ms(n: number): number;
  seconds(n: number): number;
};
```

Creates a finite, positive duration in milliseconds for writes and table defaults.

**Returns:** `number`.

```ts
import { ttl } from '@vielzeug/vault';

const cacheLifetime = ttl.minutes(5);
```

---

### `isExpired()`

```ts
function isExpired(expiresAt: number | undefined): boolean;
```

Reports whether an expiration timestamp has passed.

**Returns:** `true` when `expiresAt` is defined and no later than the current time.

```ts
import { isExpired } from '@vielzeug/vault';

if (isExpired(record.expiresAt)) console.log('expired');
```

## Factories

All factory options accept `schema`, plus optional `validators`, `logger`, and `onMetrics`. The root entry does not export any factory.

### `createMemory()`

```ts
function createMemory<S extends AnySchema>(options: {
  name?: string;
  schema: S;
} & BaseAdapterOptions<S>): VaultStore<S>;
```

Creates an in-memory portable store. A `name` enables same-origin `BroadcastChannel` observation between memory stores when the platform provides it.

| Parameter | Description |
| --- | --- |
| `schema` | Tables created by `table()` |
| `name` | Optional shared memory-store namespace |

**Returns:** `VaultStore<S>`.

```ts
import { table } from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';

const store = createMemory({ schema: { users: table<{ id: number; name: string }>('id') } });
```

---

### `createLocalStorage()`

```ts
function createLocalStorage<S extends AnySchema>(options: {
  name: string;
  onQuotaExceeded?: (table: keyof S, error: VaultQuotaError) => 'ignore' | 'throw';
  schema: S;
} & BaseAdapterOptions<S>): VaultStore<S>;
```

Creates a namespaced `localStorage` store.

| Parameter | Description |
| --- | --- |
| `name` | Required storage namespace |
| `onQuotaExceeded` | Handles a Web Storage quota error; returning `'ignore'` drops that write |
| `schema` | Tables created by `table()` |

**Returns:** `VaultStore<S>`.

```ts
import { table } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';

const store = createLocalStorage({ name: 'app', schema: { settings: table<{ id: string }>('id') } });
```

---

### `createSessionStorage()`

```ts
function createSessionStorage<S extends AnySchema>(options: {
  name: string;
  onQuotaExceeded?: (table: keyof S, error: VaultQuotaError) => 'ignore' | 'throw';
  schema: S;
} & BaseAdapterOptions<S>): VaultStore<S>;
```

Creates a namespaced `sessionStorage` store. Its options and return type match `createLocalStorage()`.

**Returns:** `VaultStore<S>`.

```ts
import { table } from '@vielzeug/vault';
import { createSessionStorage } from '@vielzeug/vault/session-storage';

const store = createSessionStorage({ name: 'checkout', schema: { cart: table<{ id: string }>('id') } });
```

---

### `createIndexedDB()`

```ts
function createIndexedDB<S extends AnySchema>(options: {
  migrate?: MigrationFn;
  name: string;
  schema: S;
  version?: number;
} & BaseAdapterOptions<S>): IndexedDbVaultStore<S>;
```

Creates an IndexedDB store with atomic batches, lazy cursor iteration, and optional schema migrations.

| Parameter | Description |
| --- | --- |
| `name` | Required database name |
| `schema` | Tables and IndexedDB secondary indexes |
| `version` | Positive schema version; defaults to `1` |
| `migrate` | Synchronous upgrade callback for version changes |

**Returns:** `IndexedDbVaultStore<S>`.

```ts
import { table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';

const store = createIndexedDB({ name: 'app', schema: { users: table<{ id: number }>('id') } });
```

---

### `createSQLite()`

```ts
function createSQLite<S extends AnySchema>(options: SQLiteVaultOptions<S>): SQLiteVaultStore<S>;
```

Creates a namespaced SQLite store with atomic batches and keyset-paginated iteration. It accepts an application-provided positional-parameter driver and never opens or imports a runtime driver.

| Parameter | Description |
| --- | --- |
| `database` | Caller-provided `SQLiteDatabase` connection |
| `name` | Namespace within the connection |
| `schema`, `validators`, `logger`, `onMetrics` | Shared factory options |
| `closeOnDispose` | Closes the connection during disposal; defaults to `false` |

**Returns:** `SQLiteVaultStore<S>`.

```ts
import { DatabaseSync } from 'node:sqlite';

import { table } from '@vielzeug/vault';
import { createSQLite } from '@vielzeug/vault/sqlite';

const store = createSQLite({
  database: new DatabaseSync(':memory:'),
  name: 'tests',
  schema: { users: table<{ id: number; name: string }>('id') },
});
```

Node `DatabaseSync`, Bun `Database`, and Deno `jsr:@db/sqlite` `Database` satisfy the protocol. Values must be JSON-compatible plain objects. During a `batch()` callback, calls on every Vault store sharing that connection reject; use `tx.*` instead.

## Store Capabilities

### `VaultStore`

```ts
interface VaultStore<S extends AnySchema> {
  clear<K extends keyof S & string>(table: K): Promise<void>;
  count<K extends keyof S & string>(table: K): Promise<number>;
  delete<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  deleteMany<K extends keyof S & string>(table: K, keys: KeyOf<S, K>[]): Promise<number>;
  entries<K extends keyof S & string>(table: K): Promise<Array<[KeyOf<S, K>, RecordOf<S, K>]>>;
  get<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  getAll<K extends keyof S & string>(table: K): Promise<RecordOf<S, K>[]>;
  getMany<K extends keyof S & string>(table: K, keys: KeyOf<S, K>[]): Promise<Array<RecordOf<S, K> | undefined>>;
  getOrDefault<K extends keyof S & string>(table: K, key: KeyOf<S, K>, defaultFn: () => RecordOf<S, K>, ttl?: TtlMs): Promise<RecordOf<S, K>>;
  has<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  isEmpty<K extends keyof S & string>(table: K): Promise<boolean>;
  keys<K extends keyof S & string>(table: K, filter?: (record: RecordOf<S, K>) => boolean): Promise<KeyOf<S, K>[]>;
  put<K extends keyof S & string>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void>;
  putAll<K extends keyof S & string>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void>;
  query<K extends keyof S & string>(table: K): QueryBuilder<RecordOf<S, K>>;
  update<K extends keyof S & string>(table: K, key: KeyOf<S, K>, changes: Partial<RecordOf<S, K>>, ttl?: TtlMs): Promise<RecordOf<S, K> | undefined>;
  upsert<K extends keyof S & string>(table: K, key: KeyOf<S, K>, fn: (existing: RecordOf<S, K> | undefined) => RecordOf<S, K>, ttl?: TtlMs): Promise<RecordOf<S, K>>;
  pruneExpired(): Promise<Record<keyof S & string, number>>;
  debug(): Promise<DebugInfo<S>>;
  observe<K extends keyof S & string>(table: K, listener: Observer<RecordOf<S, K>>, options?: { immediate?: boolean; signal?: AbortSignal }): Unsubscribe;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.asyncDispose](): Promise<void>;
}
```

The portable store API is returned by every factory. `observe()` emits the current table snapshot by default and then emits after mutations.

---

### `batch()`

```ts
interface TransactionalVaultStore<S extends AnySchema> extends VaultStore<S> {
  batch<K extends keyof S & string, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
  ): Promise<R>;
}
```

Runs a scoped atomic callback. `IndexedDbVaultStore` and `SQLiteVaultStore` provide it.

| Parameter | Description |
| --- | --- |
| `tables` | Tables the transaction may access |
| `fn` | Async callback that uses only the supplied `tx` context |

**Returns:** The callback result after commit.

```ts
await store.batch(['users'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Ada' });
});
```

---

### `iterate()`

```ts
interface IterableVaultStore<S extends AnySchema> extends VaultStore<S> {
  iterate<K extends keyof S & string>(table: K): AsyncIterable<RecordOf<S, K>>;
}
```

Lazily yields table records. `IndexedDbVaultStore` uses a cursor; `SQLiteVaultStore` uses keyset pagination.

**Returns:** An `AsyncIterable` of records.

```ts
for await (const user of store.iterate('users')) console.log(user);
```

## Queries, Pruning, and Migrations

### `QueryBuilder`

```ts
interface QueryBuilder<T extends object, N extends T = T> {
  between(field: string, lower: number | string, upper: number | string): QueryBuilder<T, N>;
  count(): Promise<number>;
  delete(): Promise<number>;
  equals<K extends keyof T & string, V extends T[K]>(field: K, value: V): QueryBuilder<T & Record<K, V>>;
  exists(): Promise<boolean>;
  filter(fn: (value: N, index: number, array: N[]) => boolean): QueryBuilder<T, N>;
  first(): Promise<N | undefined>;
  limit(n: number): QueryBuilder<T, N>;
  offset(n: number): QueryBuilder<T, N>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T, N>;
  startsWith(field: keyof T, prefix: string, options?: { ignoreCase?: boolean }): QueryBuilder<T, N>;
  toArray(): Promise<N[]>;
}
```

Builds a lazy table query. `count()` ignores `limit()`, `offset()`, and `orderBy()` — it always returns the full filtered-set size.

```ts
const page = await store.query('users').startsWith('name', 'A').orderBy('name').limit(20).toArray();
```

---

### `scheduleExpiredPrune()`

```ts
function scheduleExpiredPrune<S extends AnySchema>(
  adapter: Pick<VaultStore<S>, 'pruneExpired'>,
  options: {
    interval: number;
    onError?: (error: unknown) => void;
    signal?: AbortSignal;
  },
): () => void;
```

Schedules `pruneExpired()` at a finite, positive interval. Pass `signal: store.disposalSignal` to auto-cancel when the store is torn down.

**Returns:** A stop function.

```ts
import { scheduleExpiredPrune, ttl } from '@vielzeug/vault';

const stop = scheduleExpiredPrune(store, {
  interval: ttl.hours(1),
  signal: store.disposalSignal,
});
stop();
```

---

### `defineMigration()`

```ts
function defineMigration(steps: MigrationStep[]): MigrationFn;
```

Builds an idempotent IndexedDB migration callback from schema-change steps.

**Returns:** An IndexedDB `MigrationFn`.

```ts
import { defineMigration } from '@vielzeug/vault/indexeddb';

const migrate = defineMigration([{ field: 'email', table: 'users', type: 'addIndex' }]);
```

## Types

```ts
type VaultKey = number | string;
type Unsubscribe = () => void;
type Observer<T> = (records: T[]) => void;
type AnySchema = Record<string, {
  defaultTtl?: number;
  indexes?: readonly string[];
  key: string;
}>;
type SchemaEntry<T extends object, Key extends keyof T & string = keyof T & string> =
  T[Key] extends VaultKey ? {
    defaultTtl?: number;
    indexes?: readonly (keyof T & string)[];
    key: Key;
  } : never;
type RecordOf<S extends AnySchema, K extends keyof S> =
  S[K] extends SchemaEntry<infer R, infer _Key> ? R : never;
type KeyOf<S extends AnySchema, K extends keyof S> =
  Extract<S[K] extends SchemaEntry<infer R, infer Key> ? R[Key] : never, VaultKey>;
```

```ts
type BaseAdapterOptions<S extends AnySchema> = {
  logger?: VaultLogger;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  validators?: TableValidators<S>;
};

type VaultLogger = {
  error(message: string, context?: Error | Record<string, unknown>): void;
};

type RecordValidator<T> = {
  parse(value: unknown): T;
};

type TableValidators<S extends AnySchema> = {
  [K in keyof S]?: RecordValidator<RecordOf<S, K>>;
};

type MetricsEvent = {
  duration: number;
  operation: 'batch' | 'clear' | 'count' | 'delete' | 'deleteMany' | 'entries' | 'get' | 'getAll' |
    'getMany' | 'getOrDefault' | 'has' | 'isEmpty' | 'keys' | 'put' | 'putAll' | 'query' |
    'queryDelete' | 'update' | 'upsert';
  table: string;
};

type DebugStats = { expiredCount: number; recordCount: number };
type DebugInfo<S extends AnySchema> = { tables: Array<{ name: keyof S & string } & DebugStats> };
```

```ts
interface IndexedDbVaultStore<S extends AnySchema>
  extends TransactionalVaultStore<S>, IterableVaultStore<S> {}

type MigrationContext = {
  db: IDBDatabase;
  newVersion: number | null;
  oldVersion: number;
  tx: IDBTransaction;
};

type MigrationFn = (ctx: MigrationContext) => void;

type MigrationStep =
  | { field: string; table: string; type: 'addIndex' }
  | { field: string; table: string; type: 'removeIndex' }
  | { name: string; type: 'addTable' }
  | { name: string; type: 'removeTable' };
```

Import `MigrationContext`, `MigrationFn`, and `MigrationStep` from `@vielzeug/vault/indexeddb`.

```ts
type SQLiteParameter = null | number | string;

interface SQLiteStatement {
  all(...parameters: SQLiteParameter[]): readonly Record<string, unknown>[];
  finalize?(): void;
  get(...parameters: SQLiteParameter[]): Record<string, unknown> | undefined;
  run(...parameters: SQLiteParameter[]): unknown;
}

interface SQLiteDatabase {
  close?(): void;
  exec(sql: string): void;
  prepare(sql: string): SQLiteStatement;
}

type SQLiteVaultOptions<S extends AnySchema> = BaseAdapterOptions<S> & {
  closeOnDispose?: boolean;
  database: SQLiteDatabase;
  name: string;
};

interface SQLiteVaultStore<S extends AnySchema>
  extends TransactionalVaultStore<S>, IterableVaultStore<S> {}
```

`TransactionContext` has the same CRUD, query, and TTL methods as `VaultStore`, narrowed to the tables declared in `batch()`. Import it from `@vielzeug/vault/indexeddb` or `@vielzeug/vault/sqlite`.

## Errors

| Error | Trigger |
| --- | --- |
| `VaultError` | Any Vault-originated validation, serialization, storage, or query error |
| `VaultDisposedError` | An operation after the store or observer hub is disposed |
| `VaultScopeError` | An IndexedDB transaction accesses a table outside its declared batch scope |
| `VaultQuotaError` | A LocalStorage or SessionStorage write exceeds the browser quota |
| `VaultMigrationError` | An IndexedDB migration callback throws |

Every listed error extends `VaultError`.
