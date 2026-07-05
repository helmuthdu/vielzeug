---
title: 'Vault Examples — Lazy Iteration'
description: 'Stream large IndexedDB tables record-by-record with iterate() in @vielzeug/vault.'
---

## Lazy Iteration

### Problem

You need to process every record in a large IndexedDB table without loading the full table into memory at once. `getAll()` materialises the entire result set, which is unsuitable for tables with thousands of records or records with large payloads.

### Solution

Use `db.iterate(table)` on the `IndexedDbAdapter` returned by `createIndexedDB`. It streams records via an IDB cursor — values are loaded one at a time and expired records are skipped automatically.

```ts
import { createIndexedDB, table, ttl } from '@vielzeug/vault';
import type { IndexedDbAdapter } from '@vielzeug/vault';

type LogEntry = { id: number; level: string; message: string; timestamp: number };
const schema = { logs: table<LogEntry>('id').ttl(ttl.days(7)) };

const db: IndexedDbAdapter<typeof schema> = createIndexedDB({
  name: 'diagnostics',
  schema,
  version: 1,
});

// Seed some records
await db.putAll('logs', [
  { id: 1, level: 'info', message: 'app started', timestamp: Date.now() },
  { id: 2, level: 'warn', message: 'slow query', timestamp: Date.now() },
  { id: 3, level: 'error', message: 'timeout', timestamp: Date.now() },
]);

// Stream records without loading the full table
let exported = 0;

for await (const entry of db.iterate('logs')) {
  await sendToRemote(entry); // async work between records is safe
  exported++;
}

console.log(`exported ${exported} log entries`);

// Stop early with break — the cursor is cleaned up automatically
for await (const entry of db.iterate('logs')) {
  if (entry.level === 'error') {
    console.log('first error:', entry.message);
    break;
  }
}

async function sendToRemote(_entry: LogEntry): Promise<void> {
  // placeholder
}
```

### Pitfalls

- `iterate()` is available on `IndexedDbAdapter` and `MemoryAdapter` (returned by `createIndexedDB` and `createMemory`). `createLocalStorage` / `createSessionStorage` do not have this method — use `db.getAll(table)` or `db.query(table).toArray()` there.
- Each call to `db.iterate(table)` opens a **new readonly IDB transaction**. Two concurrent `iterate()` loops over the same table are independent — they do not share a transaction or interfere with each other.
- Doing async work between iterations (e.g., `await sendToRemote(entry)`) is safe because the IDB cursor is advanced before the yield, keeping the transaction alive. Do not assume this is true for raw IDB cursors.
- Calling `db.iterate(table)` after `db.dispose()` throws `VaultDisposedError` synchronously on the first `next()` call.

### Related

- [Querying](./querying.md)
- [TTL and Pruning](./ttl.md)
- [API Reference — IndexedDbAdapter](/vault/api.md#indexeddbadapter)
- [Usage Guide — Lazy Iteration](/vault/usage.md#lazy-iteration-indexeddb-memory)
