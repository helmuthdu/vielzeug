---
title: Vault — Usage Guide
description: Persist typed browser or SQLite data, observe table snapshots, and use atomic transactions with required durable codecs.
---

[[toc]]

## Basic Usage

Create a key-value store with a schema and codecs, then write a typed row.

```ts
import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';

interface Preference {
  id: string;
  theme: 'dark' | 'light';
}

const PreferenceSchema = s.object({ id: s.string(), theme: s.union('dark', 'light') });
const store = createLocalStorage({
  name: 'app-v2',
  schema: { preferences: table<Preference>('id') },
  codecs: { preferences: PreferenceSchema },
});

await store.put('preferences', { id: 'theme', theme: 'dark' });
console.log(await store.get('preferences', 'theme'));
```

## Create a Key-Value Store

Memory, LocalStorage, and SessionStorage return `KeyValueVaultStore`. They share portable string/number keys, bound helpers, fluent queries, TTL, and `observe()`. Memory may omit codecs; Web Storage requires them. Malformed storage envelopes are evicted lazily, while codec validation failures are surfaced without deleting persisted data.

The root entry is adapter-free. Import `createMemory` from `@vielzeug/vault/memory`, `createLocalStorage` from `@vielzeug/vault/local-storage`, or `createSessionStorage` from `@vielzeug/vault/session-storage`. Import each adapter from its focused subpath so unused backends stay out of the bundle.

Use a new storage name when upgrading from Vault 1. Old key and envelope formats are not read by Vault 2.

```ts
const store = createLocalStorage({
  name: 'app-v2',
  schema: { preferences: table<Preference>('id') },
  codecs: { preferences: PreferenceSchema },
});
```

## Read and Change Records

Use bound `update()` and `upsert()` methods for read-modify-write operations; no helper imports are required.

```ts
const updated = await store.update('preferences', 'theme', { theme: 'light' });

await store.upsert('preferences', 'locale', (current) => ({
  id: 'locale',
  theme: current?.theme ?? 'dark',
}));

console.log(updated);
```

`update()` returns `undefined` for a missing key. `upsert()` always writes the record returned by its callback. Document-store methods run atomically; key-value-store methods are non-atomic conveniences when multiple writers race.

## Iterate and Filter Records

Use `query()` for typed in-memory filtering, sorting, pagination, counting, and deletion. Use `iterate()` on a `DocumentVaultStore` for lazy cursor-based traversal, and `getAllByIndex()` on IndexedDB for declared equality indexes.

```ts
// Bound fluent query
const themed = await store.query('preferences').filter((preference) => preference.id.startsWith('theme')).toArray();

// Document store: iterate lazily
for await (const pref of db.iterate('preferences')) {
  if (pref.id.startsWith('theme')) console.log(pref);
}
```

For large tables, prefer `iterate()` on IndexedDB or SQLite instead of materializing every record with `getAll()`.

## Use TTL and Pruning

Use `ttl.*` helpers for expiring rows. Call `pruneExpired()` to reclaim storage from stale rows that accumulate without reads; tables with removed rows publish fresh observer snapshots.

```ts
import { ttl } from '@vielzeug/vault';

await store.put('preferences', { id: 'temporary', theme: 'dark' }, ttl.hours(1));

// Reclaim expired rows on a schedule owned by the application.
const pruneInterval = setInterval(() => store.pruneExpired(), ttl.hours(6));
store.disposalSignal.addEventListener('abort', () => clearInterval(pruneInterval));
```

## Observe a Table

Use `observe()` for current and future snapshots. Notifications are revision-ordered, and explicit TTL pruning publishes fresh snapshots for affected tables. Tie subscription lifetime to an `AbortSignal` when a component or request owns it.

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
import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';

const EventSchema = s.object({ id: s.number(), type: s.string() });
const db = createIndexedDB({
  name: 'app-v2',
  schema: { events: table<{ id: number; type: string }>('id') },
  codecs: { events: EventSchema },
});

await db.batch(['events'], async (tx) => {
  await tx.put('events', { id: 1, type: 'opened' });
  await tx.put('events', { id: 2, type: 'saved' });
});
```

Transaction contexts expose the same bound helpers and fluent queries; `tx.update()`, `tx.upsert()`, `tx.deleteMany()`, and query deletion remain atomic. Only await `tx.*` operations inside a batch callback. Do not retain the transaction context after the callback; later use throws `VaultScopeError`. Do not await timers, fetches, or other external asynchronous work because IndexedDB can commit an inactive transaction.

## Use SQLite Outside the Browser

Import SQLite from the opt-in subpath so the browser root stays free of runtime drivers. Vault never opens a connection or configures its SQLite process behavior for you.

```ts
import { DatabaseSync } from 'node:sqlite';

import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createSQLite } from '@vielzeug/vault/sqlite';

const EventSchema = s.object({ id: s.number(), type: s.string() });
const database = new DatabaseSync('app.db', { timeout: 5_000 });
const store = createSQLite({
  database,
  name: 'app-v2',
  schema: { events: table<{ id: number; type: string }>('id') },
  codecs: { events: EventSchema },
});

await store.batch(['events'], async (tx) => {
  await tx.put('events', { id: 1, type: 'opened' });
  await tx.put('events', { id: 2, type: 'saved' });
});
```

Node's `node:sqlite` API is experimental. Bun's `bun:sqlite` `Database` satisfies the same positional `exec()` and `prepare()` contract; configure WAL from your application when the deployment needs it. Deno does not include SQLite, but `jsr:@db/sqlite`'s `Database` satisfies the same contract when its FFI, filesystem, and environment permissions are granted.

SQLite stores serialize all access through the injected connection. `batch()` starts `BEGIN IMMEDIATE` and rolls back callback failures. While its callback runs, calls on any store sharing that connection reject rather than waiting behind the transaction; use `tx.*` instead. The underlying drivers are synchronous, so move large scans and writes to a worker or isolate when event-loop latency matters.

## Store SQLite Values and Observe Changes

SQLite accepts any JSON-compatible codec output. Circular values, `bigint`, class instances, functions, and non-finite numbers must be transformed by the codec before writing. Number and string primary keys remain distinct.

`observe()` sees mutations written through Vault stores sharing the same injected connection after a commit. It cannot detect direct SQL changes, writes from another process, or writes through another connection. The connection belongs to the caller by default; use `closeOnDispose: true` only when the store owns it.

## Handle IndexedDB Schema Migrations

Declare IndexedDB indexes in the schema. Codecs must preserve each indexed field name and value in their encoded object. Use `migrate` only for IndexedDB version upgrades and mirror Vault's fixed `value.<field>` index path.

```ts
import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createIndexedDB, type MigrationFn } from '@vielzeug/vault/indexeddb';

const UserSchema = s.object({ id: s.number(), name: s.string() });
const schema = { users: table<{ id: number; name: string }>('id', { indexes: ['name'] }) };
const migrate: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('users')) {
    tx.objectStore('users').createIndex('name', 'value.name');
  }
};

createIndexedDB({
  name: 'app-v2',
  migrate,
  schema,
  version: 2,
  codecs: { users: UserSchema },
});
```

## Framework Integration

::: code-group

```ts [React]
import { useEffect, useState } from 'react';

import type { AnySchema, KeyValueVaultStore, RecordOf } from '@vielzeug/vault';

export function useTable<S extends AnySchema, K extends keyof S & string>(store: KeyValueVaultStore<S>, table: K) {
  const [rows, setRows] = useState<RecordOf<S, K>[]>([]);

  useEffect(() => store.observe(table, setRows), [store, table]);
  return rows;
}
```

```ts [Vue 3]
import { onUnmounted, shallowRef } from 'vue';

import type { AnySchema, KeyValueVaultStore, RecordOf } from '@vielzeug/vault';

export function useTable<S extends AnySchema, K extends keyof S & string>(store: KeyValueVaultStore<S>, table: K) {
  const rows = shallowRef<RecordOf<S, K>[]>([]);
  const stop = store.observe(table, (next) => (rows.value = next));

  onUnmounted(stop);
  return rows;
}
```

```ts [Svelte]
import { readable } from 'svelte/store';

import type { AnySchema, KeyValueVaultStore, RecordOf } from '@vielzeug/vault';

export function tableStore<S extends AnySchema, K extends keyof S & string>(store: KeyValueVaultStore<S>, table: K) {
  return readable<RecordOf<S, K>[]>([], (set) => store.observe(table, set));
}
```

:::

## Working with Other Vielzeug Libraries

Keep Ripple signals as application state and persist selected changes through Vault writes.

## Best Practices

- Define one schema per storage namespace.
- Use string or finite-number primary keys only.
- Provide codecs for every durable adapter; pass Spell or another parser schema directly when identity encoding is sufficient.
- Use `observe()` for table snapshots.
- Use IndexedDB or SQLite for atomic work.
- Keep external asynchronous work outside `batch()` callbacks.
- Use `ttl.*` instead of raw durations.
- Keep SQLite scans and writes off latency-sensitive event loops.
- Dispose stores when their owner ends.
