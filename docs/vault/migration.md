---
title: Vault Migration
description: Move Vault adapter imports to focused entry points, adopt required codecs, and use bound helpers or fluent queries.
---

# Vault 3.0 Migration

Vault 3.0 splits key-value stores from transactional document stores and requires durable codecs. Bound convenience methods and the fluent query API remain available; standalone helpers are retained for functional composition. Stored data formats are unchanged from 2.x.

## `VaultStore` split into `KeyValueVaultStore` and `DocumentVaultStore`

The unified `VaultStore` interface was split. Memory, LocalStorage, and SessionStorage return `KeyValueVaultStore` (core CRUD, observe, TTL, prune). IndexedDB and SQLite return `DocumentVaultStore`, which extends `KeyValueVaultStore` with `batch()` and `iterate()`.

```ts
// Before
import type { VaultStore } from '@vielzeug/vault';

// After — key-value stores
import type { KeyValueVaultStore } from '@vielzeug/vault';
// After — document stores (IndexedDB, SQLite)
import type { DocumentVaultStore } from '@vielzeug/vault';
```

`TransactionalVaultStore` was renamed to `DocumentVaultStore`. The old alias is removed. `createIndexedDB()` returns the specialized `IndexedDbVaultStore`, which extends `DocumentVaultStore` with `getAllByIndex()` for declared indexes.

```ts
// Before
import type { TransactionalVaultStore } from '@vielzeug/vault';

// After
import type { DocumentVaultStore } from '@vielzeug/vault';
```

## Durable codecs are now required

LocalStorage, SessionStorage, IndexedDB, and SQLite now require `codecs` at construction time. Memory may omit them. A parser schema such as a Spell schema can be passed directly; `validatorCodec()` remains available when an explicit identity-encoding codec is preferred. Custom codecs validate writes by round-tripping `decode(encode(value))` and validate persisted data on decode.

```ts
// Before — codecs optional
const store = createLocalStorage({ name: 'app', schema });

// After — codecs required
import { s } from '@vielzeug/spell';

const UserSchema = s.object({ id: s.number(), name: s.string() });
const store = createLocalStorage({
  name: 'app',
  schema,
  codecs: { users: UserSchema },
});
```

IndexedDB codecs must preserve declared index field names and values in their encoded object. SQLite codecs may emit any JSON-compatible value.

## Fluent queries remain available

`store.query(table)` retains typed `equals`, `filter`, `orderBy`, `offset`, `limit`, `count`, `first`, `delete`, and `toArray` operations. Queries are in-memory composition over `getAll()`; use `iterate()` for lazy document-store scans and IndexedDB's `getAllByIndex()` for declared equality indexes.

```ts
const adults = await db.query('users').filter((user) => user.age >= 18).toArray();
const activeCount = await db.query('users').equals('status', 'active').count();
const removed = await db.query('users').equals('status', 'expired').delete();
```

`count()` ignores presentation-only `orderBy`, `offset`, and `limit`, preserving the full filtered-set count for pagination.

## Convenience methods are bound and standalone

`has`, `count`, `isEmpty`, `getMany`, `keys`, `deleteMany`, `update`, and `upsert` remain available on store instances, so existing call sites need no extra imports. Standalone forms are also exported for functional composition and mirror bound argument order without a separate schema parameter. `put()`, `update()`, and `upsert()` return the canonical value produced by codec validation.

```ts
// Bound API
await store.has('users', 1);
await store.count('users');
await store.getMany('users', [1, 2]);
await store.deleteMany('users', [1, 2]);
await store.update('users', 1, { name: 'Alice' });
await store.upsert('users', 1, (existing) => ({ id: 1, name: existing?.name ?? 'Guest' }));

// Standalone alternative
import { count } from '@vielzeug/vault';
await count(store, 'users');
```

Bound `update()` and `upsert()` are atomic on `DocumentVaultStore`; key-value stores provide non-atomic read-modify-write convenience. Use IndexedDB or SQLite when concurrent writers require atomicity.

## Transaction contexts retain the ergonomic API

`TransactionContext` includes core CRUD, `iterate()`, bound convenience methods, and `query()`. Its `update()`, `upsert()`, query deletion, and `deleteMany()` operations remain inside the enclosing transaction. A captured context becomes invalid as soon as the batch callback settles.

# Vault 2.5 Migration

Vault 2.5 tightens `table()` type safety and removes dead type aliases. No stored data formats change.

## `table()` now enforces `VaultKey` at compile time

The `key` parameter of `table()` now requires its field type to extend `VaultKey` (`number | string`). Previously, invalid key types like `boolean` compiled but failed at runtime.

```ts
// Before — compiled but threw at runtime
const bad = table<{ id: boolean }>('id');

// After — compile-time error: Type 'boolean' is not assignable to 'never'
const bad = table<{ id: boolean }>('id');
```

If you have existing schemas with key fields typed as `number | string`, they continue to work unchanged.

## `IndexedDbVaultStore` and `SQLiteVaultStore` aliases removed

These type aliases were thin wrappers over `TransactionalVaultStore`. The migration guide for 2.3.1 already announced their removal; the source now matches. Use `TransactionalVaultStore` from `@vielzeug/vault` instead.

```ts
// Before
import type { IndexedDbVaultStore } from '@vielzeug/vault/indexeddb';
import type { SQLiteVaultStore } from '@vielzeug/vault/sqlite';

// After
import type { TransactionalVaultStore } from '@vielzeug/vault';
```

# Vault 2.3.1 Migration

Vault 2.3.1 removes the metrics/debug surface, query push-down helpers, and memory-adapter cross-tab broadcast to shrink the core surface. None of these changes affect stored data formats.

## Remove `logger` and `onMetrics` from adapter options

The `VaultLogger`, `MetricsEvent`, `DebugInfo`, and `DebugStats` types and the `logger` / `onMetrics` adapter options were removed. Use your own logging wrapper around `try`/`catch` on store calls if you need error visibility.

```ts
// Before
const store = createMemory({ schema, logger: { warn: console.warn } });

// After
const store = createMemory({ schema });
```

## Replace `scheduleExpiredPrune()` with application-managed intervals

`scheduleExpiredPrune()` was removed. Schedule pruning yourself with `setInterval` and cancel it on `disposalSignal`.

```ts
// Before
const stop = scheduleExpiredPrune(store, ttl.minutes(5));

// After
const interval = setInterval(() => store.pruneExpired(), ttl.minutes(5));
store.disposalSignal.addEventListener('abort', () => clearInterval(interval));
```

## Replace `getOrDefault()` and `entries()` with existing methods

`getOrDefault()` and `entries()` were removed from `VaultStore`. Use `get()` with a fallback or `getAll()` / `keys()` to iterate.

```ts
// Before
const name = await store.getOrDefault('users', 1, 'name', 'Anonymous');
const pairs = await store.entries('users');

// After
const user = await store.get('users', 1);
const name = user?.name ?? 'Anonymous';
const all = await store.getAll('users');
const pairs = all.map((r) => [r.id, r] as const);
```

## Replace `query.between()`, `query.startsWith()`, and `query.exists()` with `filter()` and `count()`

The built-in range and prefix query helpers were removed along with the NativeRange push-down. Use `filter()` for custom predicates, `count()` for existence checks, and `first()` for a single match.

```ts
// Before
const adults = await db.query('users').between('age', 18, 65).toArray();
const jans = await db.query('users').startsWith('name', 'Jan').toArray();
const hasAdmin = await db.query('users').equals('role', 'admin').exists();

// After
const adults = await db.query('users').filter((u) => u.age >= 18 && u.age <= 65).toArray();
const jans = await db.query('users').filter((u) => u.name.startsWith('Jan')).toArray();
const hasAdmin = (await db.query('users').equals('role', 'admin').count()) > 0;
```

## Replace `IterableVaultStore` and `IndexedDbVaultStore` with `TransactionalVaultStore`

`IterableVaultStore` and the separate `IndexedDbVaultStore` interface were removed. Both `createIndexedDB()` and `createSQLite()` return `TransactionalVaultStore`, which already includes `batch()` and `iterate()`.

```ts
// Before
import type { IndexedDbVaultStore, IterableVaultStore } from '@vielzeug/vault';

// After
import type { TransactionalVaultStore } from '@vielzeug/vault';
```

## Replace `store.debug()` with `count()` and `pruneExpired()`

The `debug()` method and `DebugInfo` / `DebugStats` types were removed. Use `count()` per table and `pruneExpired()` for storage introspection.

```ts
// Before
const info = await store.debug();

// After
const count = await store.count('users');
const pruned = await store.pruneExpired();
```

## Memory adapter no longer broadcasts cross-tab changes

The memory adapter's `BroadcastChannel` integration was removed. Memory stores are now single-context. Use IndexedDB or Web Storage for cross-tab persistence.

# Vault 2.3 Migration

Vault 2.3 simplifies the schema builder, removes the TTL brand, consolidates query counts, and moves capability types out of the root entry.

## Replace `table()` builder chain with options object

```ts
// Before
const users = table<User>('id').index('email').ttl(ttl.days(7));

// After
const users = table<User>('id', { indexes: ['email'], defaultTtl: ttl.days(7) });
```

## Replace `totalCount()` with `count()`

`count()` now ignores `limit`, `offset`, and `orderBy` — it always returns the full filtered-set size. The separate `totalCount()` method was removed.

```ts
// Before
const total = await query.totalCount();

// After
const total = await query.count();
```

## Drop the `TtlMs` brand

`ttl.*` helpers now return plain `number`. Remove any `TtlMs` type references — they accept `number` directly.

## Move capability types to adapter subpaths

`TransactionContext`, `MigrationContext`, `MigrationFn`, and `MigrationStep` are no longer in the root entry. Import them from `@vielzeug/vault/indexeddb` (and `TransactionContext` also from `@vielzeug/vault/sqlite`).

# Vault 2.0 Migration

Vault 2.0 redesigns browser storage around portable keys, fixed envelopes, capability-specific stores, `observe()` and makes the root entry adapter-free. Import schemas, shared types, TTL, errors, and pruning from `@vielzeug/vault`; import exactly one storage adapter from a dedicated subpath.

## Split adapter imports

| Before | After |
| --- | --- |
| `import { createMemory, table } from '@vielzeug/vault'` | `import { table } from '@vielzeug/vault'; import { createMemory } from '@vielzeug/vault/memory'` |
| `createLocalStorage` / `createSessionStorage` from the root | `/local-storage` or `/session-storage` |
| `createIndexedDB`, `defineMigration`, or IndexedDB types from the root | `@vielzeug/vault/indexeddb` |
The `/browser` aggregate was removed. Import each browser adapter from its focused subpath. `@vielzeug/vault/sqlite` remains the opt-in SQLite entry.

- Replace `Adapter` with `VaultStore`.
- Replace `IndexedDbAdapter` with `TransactionalVaultStore`.
- Replace `watch`, `observeMany`, signals, and streams with per-table `observe()`.
- Remove codecs and versioned codecs. Start a new storage namespace or migrate data outside Vault before construction.
- Move atomic code to `createIndexedDB().batch()` in the browser or `createSQLite().batch()` with an application-provided SQLite connection.

## Replace removed APIs

| Before | After |
| --- | --- |
| `Adapter` / `MemoryAdapter` | `VaultStore` from `createMemory()`, `createLocalStorage()`, or `createSessionStorage()` |
| `IndexedDbAdapter` | `TransactionalVaultStore` from `createIndexedDB()` |
| Codecs and versioned codecs | Fixed envelopes; migrate existing encoded data before construction |
| `watch`, `observeMany`, signals, and streams | Per-table `store.observe()` |
| Atomic adapter operations | `createIndexedDB().batch()` in browser code, or `createSQLite().batch()` with an injected SQLite connection |

## Migrate browser storage to portable keys and fixed envelopes

Update browser-stored records and key construction to the 2.0 portable-key and fixed-envelope contracts. Plan and test data migration before deploying the new storage format.

## Use capability-specific stores

Replace broad store access with the narrow store capability required by each operation. Update adapters and transactions to the 2.0 store types.

## Observe storage changes

Use `observe()` for reactive integrations instead of polling or application-managed storage subscriptions. Retain and invoke its unsubscribe handle during cleanup.

Review the [Usage Guide](./usage.md), [API Reference](./api.md), and [plugin examples](./examples/plugins.md) for current store, adapter, migration, and observation contracts.
