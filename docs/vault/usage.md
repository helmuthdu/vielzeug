---
title: Vault — Usage Guide
description: Persist typed browser or SQLite data, observe table snapshots, and use atomic transactions.
---

[[toc]]

## Basic Usage

Create a portable store with one schema and write a typed row.

```ts
import { table } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';

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

Memory, LocalStorage, and SessionStorage return `VaultStore`. They share portable string/number keys, CRUD methods, queries, TTL, and `observe()`. Vault keeps record values and expiry metadata separate; the physical storage layout is adapter-specific.

The root entry is adapter-free. Import `createMemory` from `@vielzeug/vault/memory`, `createLocalStorage` from `@vielzeug/vault/local-storage`, or `createSessionStorage` from `@vielzeug/vault/session-storage`. Import each adapter from its focused subpath so unused backends stay out of the bundle.

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

## Query Records

Build a query from a table, then finish it with a terminal method. `count()` ignores pagination, which makes it suitable for page controls.

```ts
const query = store.query('preferences').startsWith('id', 'theme');
const preferences = await query.orderBy('id').limit(10).toArray();
const total = await query.count();

console.log({ preferences, total });
```

Memory and Web Storage queries scan the table. IndexedDB can use declared secondary indexes, while SQLite pushes primary-key equality, range, and case-sensitive prefix filters to the database.

## Use TTL and Pruning

Use `ttl.*` helpers for expiring rows. Schedule pruning when stale rows can accumulate without reads.

```ts
import { scheduleExpiredPrune, ttl } from '@vielzeug/vault';

await store.put('preferences', { id: 'temporary', theme: 'dark' }, ttl.hours(1));
const stopPrune = scheduleExpiredPrune(store, {
  interval: ttl.hours(6),
  signal: store.disposalSignal,
});

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

## Use IndexedDB for Browser Transactions

Choose IndexedDB when browser storage needs multiple writes to commit together or cursor iteration.

```ts
import { table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';

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

## Use SQLite Outside the Browser

Import SQLite from the opt-in subpath so the browser root stays free of runtime drivers. Vault never opens a connection or configures its SQLite process behavior for you.

```ts
import { DatabaseSync } from 'node:sqlite';

import { table } from '@vielzeug/vault';
import { createSQLite } from '@vielzeug/vault/sqlite';

const database = new DatabaseSync('app.db', { timeout: 5_000 });
const store = createSQLite({
  database,
  name: 'app-v2',
  schema: { events: table<{ id: number; type: string }>('id') },
});

await store.batch(['events'], async (tx) => {
  await tx.put('events', { id: 1, type: 'opened' });
  await tx.put('events', { id: 2, type: 'saved' });
});
```

Node's `node:sqlite` API is experimental. Bun's `bun:sqlite` `Database` satisfies the same positional `exec()` and `prepare()` contract; configure WAL from your application when the deployment needs it. Deno does not include SQLite, but `jsr:@db/sqlite`'s `Database` satisfies the same contract when its FFI, filesystem, and environment permissions are granted.

SQLite stores serialize all access through the injected connection. `batch()` starts `BEGIN IMMEDIATE` and rolls back callback failures. While its callback runs, calls on any store sharing that connection reject rather than waiting behind the transaction; use `tx.*` instead. The underlying drivers are synchronous, so move large scans and writes to a worker or isolate when event-loop latency matters.

## Store SQLite Values and Observe Changes

SQLite accepts JSON-compatible plain-object records only. Circular values, `bigint`, dates, class instances, functions, and non-finite numbers are rejected before writing. Number and string primary keys remain distinct.

`observe()` sees mutations written through Vault stores sharing the same injected connection after a commit. It cannot detect direct SQL changes, writes from another process, or writes through another connection. The connection belongs to the caller by default; use `closeOnDispose: true` only when the store owns it.

## Handle IndexedDB Schema Migrations

Declare IndexedDB indexes in the schema. Use `migrate` only for IndexedDB version upgrades and mirror Vault’s fixed `value.<field>` index path.

```ts
import { table } from '@vielzeug/vault';
import { createIndexedDB, type MigrationFn } from '@vielzeug/vault/indexeddb';

const schema = { users: table<{ id: number; name: string }>('id', { indexes: ['name'] }) };
const migrate: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('users')) {
    tx.objectStore('users').createIndex('name', 'value.name');
  }
};

createIndexedDB({ name: 'app-v2', migrate, schema, version: 2 });
```

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
- Use IndexedDB or SQLite for atomic work.
- Keep external asynchronous work outside `batch()` callbacks.
- Use `ttl.*` instead of raw durations.
- Keep SQLite scans and writes off latency-sensitive event loops, and dispose stores with their owner.
- Dispose stores when their owner ends.
