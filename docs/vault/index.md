---
title: Vault — Typed browser storage
description: Typed browser storage with portable keys, TTL, observation, and explicit IndexedDB transactions.
package: vault
category: Storage
keywords: [storage, indexeddb, localstorage, sessionstorage, ttl, browser]
related: [courier, forge, ripple]
exports: [createMemory, createLocalStorage, createSessionStorage, createIndexedDB, table, ttl, scheduleExpiredPrune, defineMigration, isExpired]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="vault" />

## Why Vault?

Vault gives browser storage one typed schema while keeping backend guarantees explicit. Use `VaultStore` for portable CRUD and observation; choose IndexedDB only when you need atomic transactions or cursor iteration.

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

<div class="decision-callout">

**Use Vault when** you need typed browser persistence with one portable CRUD API and explicit IndexedDB-only capabilities.

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
import { createLocalStorage, table } from '@vielzeug/vault';

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
- `createMemory()`, `createLocalStorage()`, and `createSessionStorage()` return portable `VaultStore` instances.
- `observe()` emits current and changed table snapshots.
- `ttl` creates validated expiration durations.
- `createIndexedDB()` returns `IndexedDbVaultStore` with `batch()` and `iterate()`.
- `defineMigration()` handles IndexedDB schema upgrades.
- `scheduleExpiredPrune()` removes stale TTL entries on an owned schedule.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Forge](../forge/index.md) saves and restores form drafts through Vault stores.
- [Ripple](../ripple/index.md) owns application state that can persist through Vault.
- [Courier](../courier/index.md) can populate persistent cache data.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
