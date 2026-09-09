---
title: 'Vault Examples — TTL and Pruning'
description: 'Write records with expiry and prune expired records in @vielzeug/vault.'
---

## TTL and Pruning

### Problem

You need records to expire automatically after a fixed duration. You also want to reclaim storage by removing expired records that have not yet been evicted by a read.

### Solution

Pass a positive millisecond duration as the third argument to `put()` or `putAll()`. Use `ttl.*` helpers to create the value. For per-table defaults, pass `defaultTtl` to the `table()` call. For explicit cleanup, call `pruneExpired()`.

```ts
import { table, ttl } from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';

type Session = { id: string; userId: number };

// Per-table default: every write to sessions uses 30 minutes unless overridden
const schema = {
  sessions: table<Session>('id', { defaultTtl: ttl.minutes(30) }),
};

const db = createMemory({ schema });

// Write with default TTL (30 minutes, from the schema)
await db.put('sessions', { id: 's1', userId: 1 });

// Override the table default at the call site
await db.put('sessions', { id: 's2', userId: 2 }, ttl.hours(8));

// All ttl.* helpers
await db.put('sessions', { id: 's3', userId: 3 }, ttl.ms(500));
await db.put('sessions', { id: 's4', userId: 4 }, ttl.seconds(30));
await db.put('sessions', { id: 's5', userId: 5 }, ttl.days(7));

// Expired records are excluded from reads automatically:
// db.get(), db.getAll(), db.count(), and queries skip expired records.

// Explicit pruning — sweeps all tables, returns count per table
const pruned = await db.pruneExpired();
console.log(pruned); // { sessions: 0 } — none have expired yet

// Schedule periodic pruning tied to the adapter lifetime
const pruneInterval = setInterval(() => db.pruneExpired(), ttl.hours(1));
db.disposalSignal.addEventListener('abort', () => clearInterval(pruneInterval));

await db.dispose();
```

### Pitfalls

- Expired records are evicted **lazily** on the next read to that key. If a table is written to frequently but rarely read, expired records accumulate. Call `pruneExpired()` to reclaim storage proactively.
- `ttl.hours(0)` throws because TTL durations must be finite positive values. Omit TTL for records that should not expire.
- On **IndexedDB**, `pruneExpired` uses a cursor-based pass — expired records are deleted without loading their values into memory. On **LocalStorage / SessionStorage** and **Memory**, each key is checked in sequence.
- To schedule periodic pruning, use `setInterval` and cancel it on `store.disposalSignal`'s `abort` event.

### Related

- [CRUD](./crud.md)
- [Validators and Error Handling](./plugins.md)
- [Usage Guide — Use TTL and Pruning](/vault/usage.md#use-ttl-and-pruning)
- [API Reference — `pruneExpired`](/vault/api.md#keyvaluevaultstore)
