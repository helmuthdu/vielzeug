---
title: Vault Migration
description: Move Vault adapter imports to focused entry points and update capability-specific storage code.
---

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
- Replace `IndexedDbAdapter` with `IndexedDbVaultStore`.
- Replace `watch`, `observeMany`, signals, and streams with per-table `observe()`.
- Remove codecs and versioned codecs. Start a new storage namespace or migrate data outside Vault before construction.
- Move atomic code to `createIndexedDB().batch()` in the browser or `createSQLite().batch()` with an application-provided SQLite connection.

## Replace removed APIs

| Before | After |
| --- | --- |
| `Adapter` / `MemoryAdapter` | `VaultStore` from `createMemory()`, `createLocalStorage()`, or `createSessionStorage()` |
| `IndexedDbAdapter` | `IndexedDbVaultStore` from `createIndexedDB()` |
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
