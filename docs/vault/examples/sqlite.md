---
title: 'Vault Examples — SQLite Transactions and Iteration'
description: 'Persist and process typed records with an application-owned SQLite connection.'
---

## SQLite Transactions and Iteration

### Problem

You need atomic writes and lazy record processing in a Node CLI or service without bundling a database driver into Vault.

### Solution

Open the connection in application code, then pass it to the SQLite subpath.

```ts
import { DatabaseSync } from 'node:sqlite';

import { table } from '@vielzeug/vault';
import { createSQLite } from '@vielzeug/vault/sqlite';

const store = createSQLite({
  database: new DatabaseSync('events.db'),
  name: 'events',
  schema: { logs: table<{ id: number; message: string }>('id') },
});

await store.batch(['logs'], async (tx) => {
  await tx.put('logs', { id: 1, message: 'started' });
  await tx.put('logs', { id: 2, message: 'finished' });
});

for await (const log of store.iterate('logs')) {
  console.log(log.message);
}

await store.dispose();
```

### Pitfalls

- Import `createSQLite` from `@vielzeug/vault/sqlite`, never the browser-safe root entry.
- Use `tx.*` rather than any Vault store sharing the connection inside `batch()` callbacks.
- Keep the iterator short-lived because it owns the connection lease until completion or closure.
- Configure SQLite driver options, WAL, file paths, and Deno FFI/filesystem/environment permissions in application code.

### Related

- [Usage](../usage.md#use-sqlite-outside-the-browser)
- [API](../api.md#sqlite)
- [IndexedDB batch transactions](./batch.md)
