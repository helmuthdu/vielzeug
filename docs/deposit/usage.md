---
title: Deposit — Usage Guide
description: Practical patterns for using Deposit with LocalStorage, SessionStorage, IndexedDB, and Memory.
---

[[toc]]

::: tip New to Deposit?
Start with the [Overview](./index.md) for installation and quick context, then use this page for end-to-end usage patterns.
:::

## Define a Schema

The `table<T>()` factory creates a typed schema entry. Pass the record type as a generic and the primary key field name as the argument.

```ts
import { table } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };
type Post = { id: number; title: string; userId: number };

const schema = {
  users: table<User>('id'),
  posts: table<Post>('id'),
};
```

Record and key types are inferred from `table<T>()`. `typeof schema` serves as the schema type wherever needed.

## Create an Adapter

### LocalStorage

```ts
import { createLocalStorage } from '@vielzeug/deposit';

const local = createLocalStorage('app', schema);
```

Use this adapter for simple browser persistence where transactional behavior is not required.

### SessionStorage

```ts
import { createSessionStorage } from '@vielzeug/deposit';

const session = createSessionStorage('app', schema);
```

Use this adapter for tab-scoped persistence that resets when the tab or window closes.

### Cookie

```ts
import { createCookie } from '@vielzeug/deposit';

const cookie = createCookie('app', schema, {
  path: '/',
  sameSite: 'Strict',
});
```

Use this adapter for small browser state that should be available through cookies. It is browser-only, so it is a good fit when you want persistence without relying on Web Storage APIs.

### IndexedDB

```ts
import { createIndexedDB } from '@vielzeug/deposit';

const idb = createIndexedDB({ dbName: 'app', schemaVersion: 1, schema });
```

Use this adapter when you need atomic transactions or larger datasets.

### Memory

```ts
import { createMemory } from '@vielzeug/deposit';

const mem = createMemory(schema);
```

Use this adapter in tests, SSR environments, or wherever browser storage APIs are unavailable. Each `createMemory(schema)` call returns a fully isolated instance — no `dbName` is needed. The interface is identical to the browser adapters.

## Basic CRUD

```ts
await idb.put('users', { id: 1, name: 'Alice', age: 30 });

const one = await idb.get('users', 1);
const all = await idb.getAll('users');

await idb.delete('users', 1);
await idb.deleteAll('users');

const total = await idb.count('users');
```

`count()` reflects live records and excludes TTL-expired entries.

### Existence check

`has()` returns `true` if a live record exists for the given key, without loading the full record.

```ts
const exists = await idb.has('users', 1); // true
const missing = await idb.has('users', 99); // false
```

### Bulk writes

`putAll()` writes multiple records in a single operation. In IndexedDB this runs as one atomic transaction.

```ts
await idb.putAll('users', [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
]);

// With TTL
await idb.putAll('sessions', sessions, ttl.hours(1));
```

## Use TTL

```ts
import { ttl } from '@vielzeug/deposit';

await idb.put('users', { id: 1, name: 'Alice', age: 30 }, ttl.minutes(5));

await idb.put('users', { id: 2, name: 'Bob', age: 28 }, ttl.hours(1));
```

Available helpers: `ttl.ms`, `ttl.seconds`, `ttl.minutes`, `ttl.hours`, `ttl.days`.

## Query Data

```ts
const result = await local
  .query('users')
  .between('age', 18, 99)
  .startsWith('name', 'a', { ignoreCase: true })
  .orderBy('name', 'asc')
  .limit(20)
  .offset(0)
  .toArray();

const count = await local.query('users').equals('age', 30).count();
```

Queries are composed lazily and run when `toArray()`, `count()`, or `first()` is called.

### Get the first result

`first()` resolves after applying all preceding operators, returning the first match or `undefined`.

```ts
const youngest = await local.query('users').orderBy('age', 'asc').first();
```

## Reactive Reads

`observe(table, listener, options?)` emits the current snapshot immediately by default and then emits again after table mutations.

```ts
const stop = idb.observe('users', (rows) => {
  console.log('users changed', rows);
});

await idb.put('users', { id: 1, name: 'Alice', age: 30 });
stop();
```

IndexedDB observers propagate across tabs/windows via `BroadcastChannel` when available. LocalStorage observers also react to cross-tab writes via the browser `storage` event.

## Update and Upsert-Like Helpers

```ts
await idb.update('users', 1, { age: 31 });

const user = await idb.getOrPut('users', {
  id: 2,
  name: 'Bob',
  age: 26,
});

const removed = await idb.deleteWhere('users', (value) => value.age < 21);

await idb.forEach('users', (value) => {
  console.log(value.name);
});

void user;
void removed;
```

## Run IndexedDB Transactions

```ts
await idb.transaction(['users'], async (tx) => {
  await tx.put('users', { id: 2, name: 'Bob', age: 28 });
  await tx.delete('users', 1);

  const current = await tx.getAll('users');
  const n = await tx.count('users');

  void current;
  void n;
});
```

If the callback throws, the transaction is aborted and changes are rolled back.

## Handle Schema Migrations

```ts
import { createIndexedDB, type MigrationFn } from '@vielzeug/deposit';

const migrate: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('users')) {
    // Example: add an index during upgrade.
    tx.objectStore('users').createIndex('name', 'name', { unique: false });
  }
};

const db = createIndexedDB({
  dbName: 'app',
  migrate,
  schema,
  schemaVersion: 2,
});
```

Increase `schemaVersion` to trigger `migrate` during `onupgradeneeded`.

## Operational Notes

- `count()` returns live records (TTL-expired records are excluded).
- Query operations run in memory over records returned from the backend.
- Keep transaction callbacks focused on DB operations for predictable atomicity.
- Call `dispose()` on IndexedDB handles in long-lived contexts when shutting down.
- `createMemory()` state is scoped to the instance; each call returns an isolated store.
- `createSessionStorage()` is tab-scoped and clears when the tab/window is closed.
- `observe()` emits an immediate snapshot first; unsubscribe when no longer needed.

## Testing with the Memory Adapter

Swap any adapter for `createMemory` in test setup to get a browser-free, zero-teardown store:

```ts
import { createMemory } from '@vielzeug/deposit';
import { schema } from '../src/schema';

// No localStorage mocks, no fake-indexeddb — just a plain Map under the hood.
const db = createMemory(schema);

beforeEach(async () => {
  await db.deleteAll('users');
});

test('creates a user', async () => {
  await db.put('users', { id: 1, name: 'Alice', age: 30 });
  expect(await db.has('users', 1)).toBe(true);
});
```

The memory adapter is TTL-accurate: records expire lazily on read, just like the other adapters.

## Common Pattern: Swap Adapters by Environment

```ts
import {
  createCookie,
  createIndexedDB,
  createLocalStorage,
  createMemory,
  createSessionStorage,
  type Adapter,
} from '@vielzeug/deposit';
import { schema } from './schema';

function createStorage(): Adapter<typeof schema> {
  if (typeof indexedDB !== 'undefined') {
    return createIndexedDB({ dbName: 'app', schemaVersion: 1, schema });
  }

  if (typeof localStorage !== 'undefined') {
    return createLocalStorage('app', schema);
  }

  if (typeof sessionStorage !== 'undefined') {
    return createSessionStorage('app', schema);
  }

  if (typeof document !== 'undefined') {
    return createCookie('app', schema);
  }

  // SSR or test environment
  return createMemory(schema);
}
```

## Framework Integration

Deposit is framework-agnostic. Use `observe()` with framework-specific subscriptions to bridge reactivity.

::: code-group

```tsx [React]
import { useEffect, useState } from 'react';
import { createLocalStorage, table } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };
const schema = { users: table<User>('id') };
const store = createLocalStorage('app', schema);

function useUsers() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const stop = store.observe('users', setUsers);
    return () => stop();
  }, []);

  return users;
}
```

```ts [Vue 3]
import { ref, onScopeDispose } from 'vue';
import { createLocalStorage, table } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };
const schema = { users: table<User>('id') };
const store = createLocalStorage('app', schema);

function useUsers() {
  const users = ref<User[]>([]);
  const stop = store.observe('users', (rows) => { users.value = rows; });
  onScopeDispose(() => stop());
  return users;
}
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createLocalStorage, table } from '@vielzeug/deposit';

  type User = { id: number; name: string; age: number };
  const schema = { users: table<User>('id') };
  const store = createLocalStorage('app', schema);

  let users: User[] = [];
  const stop = store.observe('users', (rows) => { users = rows; });
  onDestroy(() => stop());
</script>

{#each users as user}
  <p>{user.name}</p>
{/each}
```

:::

### Pitfalls

- **React:** Calling `openStore()` inside a render without `useRef` or `useMemo` creates a new store handle on every render — use `useRef` to hold the reference.
- **Vue 3:** Reading stored values in `setup()` (synchronously) always returns `undefined` — always read inside `onMounted` since IndexedDB is async.
- **Svelte:** Writing to a Svelte `writable` from within an async `onMount` after the component is destroyed will throw — check if the component is still mounted before updating.

## Working with Other Vielzeug Libraries

### With Validit

Use Validit to validate data before writing it to storage.

```ts
import { createLocalStorage, table } from '@vielzeug/deposit';
import { v } from '@vielzeug/validit';

type User = { id: number; name: string; age: number };
const schema = { users: table<User>('id') };
const store = createLocalStorage('app', schema);

const UserSchema = v.object({
  id: v.number(),
  name: v.string().min(1),
  age: v.number().min(0).max(120),
});

async function saveUser(data: unknown) {
  const result = UserSchema.safeParse(data);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  await store.put('users', result.value);
}
```

### With Stateit

Bridge store observations to Stateit signals for reactive UI.

```ts
import { createLocalStorage, table } from '@vielzeug/deposit';
import { signal, effect } from '@vielzeug/stateit';

type User = { id: number; name: string; age: number };
const schema = { users: table<User>('id') };
const db = createLocalStorage('app', schema);

const users = signal<User[]>([]);
db.observe('users', (rows) => { users.value = rows; });

effect(() => console.log('users updated:', users.value.length));
```

## Best Practices

- Use `createMemory()` in tests — it is isolated, synchronous, and has no side effects.
- Prefer `createIndexedDB()` for data sets larger than a few kilobytes or when you need atomic transactions.
- Call `dispose()` on IndexedDB adapters during app teardown to release the database connection.
- Unsubscribe `observe()` listeners when the component unmounts to prevent stale updates.
- Use TTL for cache-like data; avoid TTL for user data that should persist indefinitely.
- Run `putAll()` for bulk writes — it performs one transaction instead of one per record.
- Keep `migrate()` callbacks forward-only; do not mutate data for versions already in production.
- Use `createMemory()` in SSR environments where browser APIs are unavailable.
