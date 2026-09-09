---
title: Vault — API Reference
description: Reference for Vault schemas, adapter entry points, storage capabilities, codecs, SQLite drivers, and errors.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createMemory()` | In-memory key-value store | Async API | Import from `/memory`; codecs optional |
| `createLocalStorage()` / `createSessionStorage()` | Web Storage-backed key-value stores | Async API | Codecs required; available only where the corresponding Web API exists |
| `createIndexedDB()` | Browser document store with transactions and cursor iteration | Async API | Import from `/indexeddb`; codecs required |
| `createSQLite()` | Driver-neutral SQLite document store | Async API over a synchronous driver | Import from `/sqlite`; codecs required |
| `defineMigration()` | Declarative IndexedDB schema upgrade | Sync | Import from `/indexeddb` |
| `table()` | Typed record schema | Sync | The key field must be a string or finite number |
| `validatorCodec()` | Create an identity-encoding codec from a parser | Sync | Spell schemas can also be passed directly |
| `ttl` | Valid expiration durations | Sync | Durations must be positive |
| `isExpired()` | Check an expiration timestamp | Sync | Returns `false` when no expiry is set |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/vault` | Adapter-free schemas, TTL, errors, codecs, derived helpers, and shared types |
| `@vielzeug/vault/memory` | `createMemory` |
| `@vielzeug/vault/local-storage` | `createLocalStorage` |
| `@vielzeug/vault/session-storage` | `createSessionStorage` |
| `@vielzeug/vault/indexeddb` | `createIndexedDB`, `defineMigration`, migrations, and IndexedDB-only types |
| `@vielzeug/vault/sqlite` | `createSQLite`, the SQLite driver protocol types, and `TransactionContext` |

## Schemas, Codecs, and TTL

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

### `validatorCodec()`

```ts
function validatorCodec<T>(validator: { parse(value: unknown): T }): RecordCodec<T>;
```

Wraps any object with a `parse(value): T` method as an identity-encoding `RecordCodec`. Parser schemas can also be passed directly in `codecs`; a Spell schema requires no adapter.

**Returns:** A `RecordCodec<T>`.

```ts
import { s } from '@vielzeug/spell';

const UserSchema = s.object({ id: s.number(), name: s.string() });
const store = createLocalStorage({
  name: 'app',
  schema: { users: table<{ id: number; name: string }>('id') },
  codecs: { users: UserSchema },
});
```

Custom `RecordCodec` values validate writes by round-tripping `decode(encode(value))`. IndexedDB codecs must preserve declared indexed field names and values in their encoded object.

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

Durable factories (LocalStorage, SessionStorage, IndexedDB, SQLite) require `codecs`. Memory may omit them.

### `createMemory()`

```ts
function createMemory<S extends AnySchema>(options: MemoryStoreOptions<S>): KeyValueVaultStore<S>;
```

Creates an in-memory key-value store. Codecs are optional because memory values never cross a trust boundary.

| Parameter | Description |
| --- | --- |
| `schema` | Tables created by `table()` |
| `codecs` | Optional per-table codecs |

**Returns:** `KeyValueVaultStore<S>`.

```ts
import { table } from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';

const store = createMemory({ schema: { users: table<{ id: number; name: string }>('id') } });
```

---

### `createLocalStorage()`

```ts
function createLocalStorage<S extends AnySchema>(options: DurableStoreOptions<S> & {
  name: string;
  onQuotaExceeded?: (table: keyof S, error: VaultQuotaError) => 'ignore' | 'throw';
}): KeyValueVaultStore<S>;
```

Creates a namespaced `localStorage` store. Codecs are required.

| Parameter | Description |
| --- | --- |
| `schema` | Tables created by `table()` |
| `codecs` | Required per-table codecs |
| `name` | Required storage namespace |
| `onQuotaExceeded` | Handles a Web Storage quota error; returning `'ignore'` drops that write |

**Returns:** `KeyValueVaultStore<S>`.

```ts
import { table } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';

const store = createLocalStorage({
  name: 'app',
  schema: { settings: table<{ id: string }>('id') },
  codecs: { settings: SettingsSchema },
});
```

---

### `createSessionStorage()`

```ts
function createSessionStorage<S extends AnySchema>(options: DurableStoreOptions<S> & {
  name: string;
  onQuotaExceeded?: (table: keyof S, error: VaultQuotaError) => 'ignore' | 'throw';
}): KeyValueVaultStore<S>;
```

Creates a namespaced `sessionStorage` store. Its options and return type match `createLocalStorage()`.

**Returns:** `KeyValueVaultStore<S>`.

```ts
import { table } from '@vielzeug/vault';
import { createSessionStorage } from '@vielzeug/vault/session-storage';

const store = createSessionStorage({
  name: 'checkout',
  schema: { cart: table<{ id: string }>('id') },
  codecs: { cart: CartSchema },
});
```

---

### `createIndexedDB()`

```ts
function createIndexedDB<S extends AnySchema>(options: DurableStoreOptions<S> & {
  migrate?: MigrationFn;
  name: string;
  version?: number;
}): IndexedDbVaultStore<S>;
```

Creates an IndexedDB document store with atomic batches, lazy cursor iteration, and optional schema migrations. Codecs are required.

| Parameter | Description |
| --- | --- |
| `schema` | Tables and IndexedDB secondary indexes |
| `codecs` | Required per-table codecs |
| `name` | Required database name |
| `version` | Positive schema version; defaults to `1` |
| `migrate` | Synchronous upgrade callback for version changes |

**Returns:** `IndexedDbVaultStore<S>`. Its `getAllByIndex(table, field, value)` method queries a declared IndexedDB index without scanning the full table.

```ts
import { table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';

const store = createIndexedDB({
  name: 'app',
  schema: { users: table<{ id: number; role: string }>('id', { indexes: ['role'] }) },
  codecs: { users: UserSchema },
});

const admins = await store.getAllByIndex('users', 'role', 'admin');
```

---

### `createSQLite()`

```ts
function createSQLite<S extends AnySchema>(options: SQLiteVaultOptions<S>): DocumentVaultStore<S>;
```

Creates a namespaced SQLite document store with atomic batches and keyset-paginated iteration. Codecs are required. It accepts an application-provided positional-parameter driver and never opens or imports a runtime driver.

| Parameter | Description |
| --- | --- |
| `schema` | Tables created by `table()` |
| `codecs` | Required per-table codecs |
| `database` | Caller-provided `SQLiteDatabase` connection |
| `name` | Namespace within the connection |
| `closeOnDispose` | Closes the connection during disposal; defaults to `false` |

**Returns:** `DocumentVaultStore<S>`.

```ts
import { DatabaseSync } from 'node:sqlite';

import { table } from '@vielzeug/vault';
import { createSQLite } from '@vielzeug/vault/sqlite';

const store = createSQLite({
  database: new DatabaseSync(':memory:'),
  name: 'tests',
  schema: { users: table<{ id: number; name: string }>('id') },
  codecs: { users: UserSchema },
});
```

Node `DatabaseSync`, Bun `Database`, and Deno `jsr:@db/sqlite` `Database` satisfy the protocol. Codec output may be any JSON-compatible value. During a `batch()` callback, calls on every Vault store sharing that connection reject; use `tx.*` instead.

## Store Capabilities

### `KeyValueVaultStore`

```ts
interface KeyValueVaultStore<S extends AnySchema> {
  clear(table): Promise<void>;
  count(table): Promise<number>;
  delete(table, key): Promise<boolean>;
  deleteMany(table, keys): Promise<number>;
  get(table, key): Promise<Record | undefined>;
  getAll(table): Promise<Record[]>;
  getMany(table, keys): Promise<(Record | undefined)[]>;
  has(table, key): Promise<boolean>;
  isEmpty(table): Promise<boolean>;
  keys(table, filter?): Promise<VaultKey[]>;
  query(table): QueryBuilder<Record>;
  update(table, key, changes, ttl?): Promise<Record | undefined>;
  upsert(table, key, update, ttl?): Promise<Record>;
  observe(table, listener, options?): Unsubscribe;
  pruneExpired(): Promise<Record<string, number>>;
  put<K extends keyof S & string>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<RecordOf<S, K>>;
  putAll(table, values, ttl?): Promise<void>;
  readonly disposalSignal: AbortSignal;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  [Symbol.asyncDispose](): Promise<void>;
}
```

The portable key-value store API is returned by Memory and Web Storage factories. `put()`, `update()`, and `upsert()` return the canonical value produced by codec validation. `observe()` emits the current table snapshot by default and then emits after mutations.

---

### `DocumentVaultStore`

```ts
interface DocumentVaultStore<S extends AnySchema> extends KeyValueVaultStore<S> {
  batch<K extends keyof S & string, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
  ): Promise<R>;
  iterate<K extends keyof S & string>(table: K): AsyncIterable<RecordOf<S, K>>;
}
```

`batch()` runs a scoped atomic callback. `iterate()` lazily yields table records — IndexedDB uses a cursor, SQLite uses keyset pagination. Both are provided by `createIndexedDB()` and `createSQLite()`.

| Parameter | Description |
| --- | --- |
| `tables` | Tables the transaction may access |
| `fn` | Async callback that uses only the supplied `tx` context |

**Returns:** The callback result after commit.

```ts
await store.batch(['users'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Ada' });
});

for await (const user of store.iterate('users')) console.log(user);
```

## Bound and Standalone Helpers

Convenience operations are bound to every store and transaction context. Standalone forms remain exported from `@vielzeug/vault` for functional composition. `store.query(table)` provides fluent in-memory filtering, ordering, pagination, counting, first-match, and deletion.

| Helper | Signature | Description |
| --- | --- | --- |
| `has()` | `(store, table, key) => Promise<boolean>` | Check whether a record exists |
| `count()` | `(store, table) => Promise<number>` | Count live records |
| `isEmpty()` | `(store, table) => Promise<boolean>` | Check whether a table has no live records |
| `getMany()` | `(store, table, keys) => Promise<(T \| undefined)[]>` | Fetch multiple records by key |
| `keys()` | `(store, table, filter?) => Promise<VaultKey[]>` | Fetch live primary keys, optionally filtered by record |
| `deleteMany()` | `(store, table, keys) => Promise<number>` | Delete multiple records, return count |
| `update()` | `(store, table, key, changes, ttl?) => Promise<T \| undefined>` | Partially update an existing record |
| `upsert()` | `(store, table, key, fn, ttl?) => Promise<T>` | Read-modify-write with callback |

```ts
const exists = await store.has('users', 1);
const total = await store.count('users');
const [a, b] = await store.getMany('users', [1, 2]);
const updated = await store.update('users', 1, { name: 'Alice' });
const result = await store.upsert('users', 99, (existing) => ({ id: 99, name: existing?.name ?? 'Guest' }));

const active = await store.query('users').equals('status', 'active').orderBy('name').limit(20).toArray();
const activeCount = await store.query('users').equals('status', 'active').count();

// Standalone form when functional composition is preferable:
const empty = await isEmpty(store, 'users');
```

Bound `update()` and `upsert()` are atomic on document stores. Their key-value-store forms are non-atomic convenience operations.

### `QueryBuilder`

```ts
interface QueryBuilder<T extends object> {
  equals<K extends keyof T & string>(field: K, value: T[K]): QueryBuilder<T>;
  filter(predicate: (value: T, index: number, array: readonly T[]) => boolean): QueryBuilder<T>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
  offset(count: number): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  count(): Promise<number>;
  first(): Promise<T | undefined>;
  delete(): Promise<number>;
  toArray(): Promise<T[]>;
}
```

Queries materialize through `getAll()`. `count()` ignores ordering, offset, and limit. Document-store query deletion and bound bulk mutations execute atomically.

## Migrations

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
type SchemaEntry<T extends object, Key extends keyof T & string = keyof T & string> = {
  defaultTtl?: number;
  indexes?: readonly (keyof T & string)[];
  key: Key;
};
type RecordOf<S extends AnySchema, K extends keyof S> =
  S[K] extends SchemaEntry<infer R, infer _Key> ? R : never;
type KeyOf<S extends AnySchema, K extends keyof S> =
  Extract<S[K] extends SchemaEntry<infer R, infer Key> ? R[Key] : never, VaultKey>;
```

```ts
type RecordCodec<T> = {
  decode(value: unknown): T;
  encode(value: T): unknown;
};

type RecordParser<T> = { parse(value: unknown): T };
type CodecInput<T> = RecordCodec<T> | RecordParser<T>;

type TableCodecs<S extends AnySchema> = {
  [K in keyof S]: CodecInput<RecordOf<S, K>>;
};

type MemoryStoreOptions<S extends AnySchema> = {
  schema: S;
  codecs?: TableCodecs<S>;
};

type DurableStoreOptions<S extends AnySchema> = {
  schema: S;
  codecs: TableCodecs<S>;
};
```

```ts
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
  get(...parameters: SQLiteParameter[]): Record<string, unknown> | null | undefined;
  run(...parameters: SQLiteParameter[]): unknown;
}

interface SQLiteDatabase {
  close?(): void;
  exec(sql: string): void;
  prepare(sql: string): SQLiteStatement;
}

type SQLiteVaultOptions<S extends AnySchema> = DurableStoreOptions<S> & {
  closeOnDispose?: boolean;
  database: SQLiteDatabase;
  name: string;
};
```

```ts
interface TransactionContext<S extends AnySchema, K extends keyof S & string = keyof S & string> {
  clear<T extends K>(table: T): Promise<void>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  iterate<T extends K>(table: T): AsyncIterable<RecordOf<S, T>>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: number): Promise<RecordOf<S, T>>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: number): Promise<void>;
}
```

`TransactionContext` has core CRUD, `iterate()`, and TTL methods, narrowed to the tables declared in `batch()`. Import it from `@vielzeug/vault/indexeddb` or `@vielzeug/vault/sqlite`.

## Errors

| Error | Trigger |
| --- | --- |
| `VaultError` | Any Vault-originated validation, serialization, storage, or codec error |
| `VaultDisposedError` | An operation after the store or observer hub is disposed |
| `VaultScopeError` | A `batch()` callback accesses a table outside its declared scope |
| `VaultQuotaError` | A LocalStorage or SessionStorage write exceeds the browser quota |
| `VaultMigrationError` | An IndexedDB migration callback throws |

Every listed error extends `VaultError`.
