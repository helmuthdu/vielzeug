---
title: Vault — Examples
description: Practical Vault examples for browser storage, SQLite, TTL, transactions, observation, and framework integration.
---

## Browser Key-Value Store with TTL

```ts
import { s } from '@vielzeug/spell';
import { table, ttl } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';

interface Session {
  id: string;
  token: string;
}

const SessionSchema = s.object({ id: s.string(), token: s.string() });
const store = createLocalStorage({
  name: 'app-v2',
  schema: { sessions: table<Session>('id', { defaultTtl: ttl.hours(1) }) },
  codecs: { sessions: SessionSchema },
});

await store.put('sessions', { id: 'current', token: 'FAKE-TOKEN-FOR-DOCS' });
console.log(await store.get('sessions', 'current'));
```

## IndexedDB with Transactions and Iteration

```ts
import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';

interface Event {
  id: number;
  type: string;
  createdAt: number;
}

const EventSchema = s.object({ createdAt: s.number(), id: s.number(), type: s.string() });
const db = createIndexedDB({
  name: 'events',
  schema: { events: table<Event>('id', { indexes: ['type'] }) },
  codecs: { events: EventSchema },
});

await db.batch(['events'], async (tx) => {
  await tx.put('events', { id: 1, type: 'opened', createdAt: Date.now() });
  await tx.put('events', { id: 2, type: 'saved', createdAt: Date.now() });
});

for await (const event of db.iterate('events')) {
  console.log(event.type);
}
```

## SQLite Document Store

```ts
import { DatabaseSync } from 'node:sqlite';

import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createSQLite } from '@vielzeug/vault/sqlite';

interface Job {
  id: string;
  status: 'queued' | 'running' | 'done';
}

const JobSchema = s.object({ id: s.string(), status: s.union('queued', 'running', 'done') });
const database = new DatabaseSync(':memory:');
const store = createSQLite({
  database,
  name: 'app',
  schema: { jobs: table<Job>('id') },
  codecs: { jobs: JobSchema },
});

await store.batch(['jobs'], async (tx) => {
  await tx.put('jobs', { id: 'job-1', status: 'queued' });
  await tx.put('jobs', { id: 'job-2', status: 'running' });
});

for await (const job of store.iterate('jobs')) {
  console.log(job.id, job.status);
}
```

## Observe Table Changes

```ts
const stop = store.observe('sessions', (sessions) => {
  console.log(`Active sessions: ${sessions.length}`);
});

store.disposalSignal.addEventListener('abort', stop);
```

## Bound Helpers and Queries

```ts
console.log(await store.has('sessions', 'current'));
console.log(await store.count('sessions'));
console.log(await store.isEmpty('sessions'));

const [a, b] = await store.getMany('sessions', ['current', 'old']);
console.log(await store.keys('sessions'));
console.log(await store.deleteMany('sessions', ['old', 'expired']));

await store.update('sessions', 'current', { token: 'FAKE-UPDATED-TOKEN' });
await store.upsert('sessions', 'temp', (existing) => ({
  id: 'temp',
  token: existing?.token ?? 'generated',
}));

const current = await store.query('sessions').equals('id', 'current').first();
(void a, b, current);
```

## React Hook

```tsx
import { useEffect, useState } from 'react';

import type { AnySchema, KeyValueVaultStore, RecordOf } from '@vielzeug/vault';

export function useTable<S extends AnySchema, K extends keyof S & string>(
  store: KeyValueVaultStore<S>,
  table: K,
): RecordOf<S, K>[] {
  const [rows, setRows] = useState<RecordOf<S, K>[]>([]);

  useEffect(() => store.observe(table, setRows), [store, table]);
  return rows;
}
```

## Migration Example

```ts
import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createIndexedDB, defineMigration } from '@vielzeug/vault/indexeddb';

const UserSchema = s.object({ email: s.string().email(), id: s.number() });
const migrate = defineMigration([
  { field: 'email', table: 'users', type: 'addIndex' },
]);

const db = createIndexedDB({
  name: 'app-v2',
  version: 2,
  migrate,
  schema: { users: table<{ id: number; email: string }>('id', { indexes: ['email'] }) },
  codecs: { users: UserSchema },
});
```

## Recipe Examples

- [CRUD Operations](./examples/crud.md)
- [Filtering and Pagination](./examples/querying.md)
- [TTL and Pruning](./examples/ttl.md)
- [IndexedDB Batch Transactions](./examples/batch.md)
- [IndexedDB Lazy Iteration](./examples/iterate.md)
- [SQLite Transactions and Iteration](./examples/sqlite.md)
- [Reactive Tables with observe()](./examples/reactive.md)
- [Validators and Error Handling](./examples/plugins.md)
