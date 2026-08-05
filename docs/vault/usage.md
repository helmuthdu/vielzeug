---
title: Vault — Usage Guide
description: Persist typed browser data, observe table snapshots, and use IndexedDB transactions.
---

[[toc]]

## Basic Usage

Create a portable store with one schema and write a typed row.

```ts
import { createLocalStorage, table } from '@vielzeug/vault';

interface Preference {
  id: string;
  theme: 'dark' | 'light';
}

const store = createLocalStorage({
  name: 'app-v2',
  schema: { preferences: table<Preference>('id') },
});

await store.put('preferences', { id: 'theme', theme: 'dark' });
console.log(await store.get('preferences', 'theme'));
```

## Create a Portable Store

Memory, LocalStorage, and SessionStorage return `VaultStore`. They share portable string/number keys, fixed `{ value, expiresAt? }` envelopes, CRUD methods, queries, TTL, and `observe()`.

Use a new storage name when upgrading from Vault 1. Old key and envelope formats are not read by Vault 2.

```ts
const store = createLocalStorage({
  name: 'app-v2',
  schema: { preferences: table<Preference>('id') },
});
```

## Read and Change Records

Use `update()` for an existing row and `upsert()` when the row may not exist.

```ts
const updated = await store.update('preferences', 'theme', { theme: 'light' });

await store.upsert('preferences', 'locale', (current) => ({
  id: 'locale',
  theme: current?.theme ?? 'dark',
}));

console.log(updated);
```

`update()` returns `undefined` for a missing key. `upsert()` always writes the record returned by its callback.

## Use TTL and Pruning

Use `ttl.*` helpers for expiring rows. Schedule pruning when stale rows can accumulate without reads.

```ts
import { scheduleExpiredPrune, ttl } from '@vielzeug/vault';

await store.put('preferences', { id: 'temporary', theme: 'dark' }, ttl.hours(1));
const stopPrune = scheduleExpiredPrune(store, { interval: ttl.hours(6), signal: store.disposalSignal });

stopPrune();
```

## Observe a Table

Use `observe()` for current and future snapshots. Tie subscription lifetime to an `AbortSignal` when a component or request owns it.

```ts
const controller = new AbortController();

store.observe('preferences', (preferences) => {
  console.log(preferences);
}, { signal: controller.signal });

controller.abort();
```

## Use IndexedDB for Atomic Work

Choose IndexedDB when multiple writes must commit together or when you need cursor iteration.

```ts
import { createIndexedDB, table } from '@vielzeug/vault';

const db = createIndexedDB({
  name: 'app-v2',
  schema: { events: table<{ id: number; type: string }>('id') },
});

await db.batch(['events'], async (tx) => {
  await tx.put('events', { id: 1, type: 'opened' });
  await tx.put('events', { id: 2, type: 'saved' });
});
```

Only await `tx.*` operations inside a batch callback. Do not await timers, fetches, or other external asynchronous work; IndexedDB can commit an inactive transaction.

## Handle Schema Migrations

Declare indexes in schema. Use `migrate` only for version upgrades and mirror Vault’s fixed `value.<field>` index path.

```ts
import { createIndexedDB, table, type MigrationFn } from '@vielzeug/vault';

const schema = { users: table<{ id: number; name: string }>('id').index('name') };
const migrate: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('users')) {
    tx.objectStore('users').createIndex('name', 'value.name');
  }
};

createIndexedDB({ name: 'app-v2', migrate, schema, version: 2 });
```

## Upgrade from Vault 1

- Replace `Adapter` with `VaultStore`.
- Replace `IndexedDbAdapter` with `IndexedDbVaultStore`.
- Replace `watch`, `observeMany`, signals, and streams with per-table `observe()`.
- Remove codecs and versioned codecs. Start a new storage namespace or migrate data outside Vault before construction.
- Move atomic code to `createIndexedDB().batch()`.

## Framework Integration

::: code-group

```ts [React]
import { useEffect, useState } from 'react';

import type { AnySchema, RecordOf, VaultStore } from '@vielzeug/vault';

export function useTable<S extends AnySchema, K extends keyof S & string>(store: VaultStore<S>, table: K) {
  const [rows, setRows] = useState<RecordOf<S, K>[]>([]);

  useEffect(() => store.observe(table, setRows), [store, table]);
  return rows;
}
```

```ts [Vue 3]
import { onUnmounted, shallowRef } from 'vue';

import type { AnySchema, RecordOf, VaultStore } from '@vielzeug/vault';

export function useTable<S extends AnySchema, K extends keyof S & string>(store: VaultStore<S>, table: K) {
  const rows = shallowRef<RecordOf<S, K>[]>([]);
  const stop = store.observe(table, (next) => (rows.value = next));

  onUnmounted(stop);
  return rows;
}
```

```ts [Svelte]
import { readable } from 'svelte/store';

import type { AnySchema, RecordOf, VaultStore } from '@vielzeug/vault';

export function tableStore<S extends AnySchema, K extends keyof S & string>(store: VaultStore<S>, table: K) {
  return readable<RecordOf<S, K>[]>([], (set) => store.observe(table, set));
}
```

:::

## Working with Other Vielzeug Libraries

Use Forge’s Vault helpers for explicit form-draft persistence. Keep Ripple signals as application state and persist selected changes through Vault writes.

## Best Practices

- Define one schema per storage namespace.
- Use string or finite-number primary keys only.
- Choose a new namespace for Vault 1 storage unless you migrate it yourself.
- Use `observe()` for table snapshots.
- Use IndexedDB for atomic work.
- Keep external asynchronous work outside `batch()` callbacks.
- Use `ttl.*` instead of raw durations.
- Dispose stores when their owner ends.
