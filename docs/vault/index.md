---
title: Vault — Typed storage
description: Typed browser storage and opt-in driver-neutral SQLite with portable keys, TTL, observation, and transactions.
package: vault
category: Storage
keywords: [storage, indexeddb, localstorage, sessionstorage, sqlite, ttl, browser, node, deno]
related: [courier, forge, ripple]
exports: [table, ttl, scheduleExpiredPrune, isExpired, createMemory, createLocalStorage, createSessionStorage, createIndexedDB, createSQLite]
environments: [browser, node, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="vault" />

## Why Vault?

Vault gives browser and SQLite persistence one typed schema while keeping backend guarantees explicit. Use `VaultStore` for portable CRUD and observation; choose IndexedDB or the opt-in SQLite subpath when you need atomic transactions or lazy iteration.

```ts
// Before
localStorage.setItem('theme', JSON.stringify({ value: 'dark' }));
const theme = JSON.parse(localStorage.getItem('theme') ?? '{}').value;

// After
await store.put('preferences', { id: 'theme', value: 'dark' });
const theme = await store.get('preferences', 'theme');
```

| Feature | Vault | Raw Web Storage | Dexie |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="vault" type="size" /> | Browser built-in | Extra dependency |
| Runtime dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Typed schema and keys | <ore-icon name="check" size="16"></ore-icon> | Application-defined | <ore-icon name="check" size="16"></ore-icon> |
| Portable Memory/Web Storage API | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> | IndexedDB only |
| Explicit atomic transactions | IndexedDB capability | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Driver-neutral SQLite | Opt-in subpath | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |

<div class="decision-callout">

**Use Vault when** you need typed browser persistence or application-owned SQLite with one portable CRUD API and explicit storage capabilities.

**Consider raw Web Storage when** you only persist one or two unstructured values. **Consider Dexie when** you need a broader IndexedDB ecosystem.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/vault
```

```sh [npm]
npm install @vielzeug/vault
```

```sh [yarn]
yarn add @vielzeug/vault
```

:::

## Quick Start

Define a schema, create a portable store, and dispose it with its owner.

```ts
import { table } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';

const store = createLocalStorage({
  name: 'app-v2',
  schema: { preferences: table<{ id: string; theme: 'dark' | 'light' }>('id') },
});

try {
  await store.put('preferences', { id: 'theme', theme: 'dark' });
  console.log(await store.get('preferences', 'theme'));
} finally {
  await store.dispose();
}
```

## Features

<div class="features-grid">

- `table()` defines typed records with portable string or number keys.
- `/memory`, `/local-storage`, and `/session-storage` return portable `VaultStore` instances without loading other adapters.
- `observe()` emits current and changed table snapshots.
- `ttl` creates validated expiration durations.
- `/indexeddb` returns `IndexedDbVaultStore` with `batch()` and `iterate()`.
- `createSQLite()` is an opt-in, driver-neutral subpath for Node, Bun, and Deno SQLite drivers.
- `/indexeddb` also exports `defineMigration()` for schema upgrades.
- `scheduleExpiredPrune()` removes stale TTL entries on an owned schedule.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Forge](../forge/index.md) saves and restores form drafts through Vault stores.
- [Ripple](../ripple/index.md) owns application state that can persist through Vault.
- [Courier](../courier/index.md) can populate persistent cache data.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
