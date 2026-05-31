---
title: 'Vault Examples — TTL and Pruning'
description: 'Write records with expiry and prune expired records in @vielzeug/vault.'
---

## TTL and Pruning

### Problem

You need records to expire automatically after a fixed duration. You also want to reclaim storage by removing expired records that have not yet been evicted by a read.

### Solution

Pass a `TtlMs` value as the third argument to `put()` or `putAll()`. Use `ttl.*` helpers to create the value — raw numbers are rejected by the type system. For per-table defaults, chain `.ttl()` on the `table()` call. For explicit cleanup, call `pruneExpired()` or schedule it with `scheduleExpiredPrune`.

```ts
import { createMemory, scheduleExpiredPrune, table, ttl } from '@vielzeug/vault';

type Session = { id: string; userId: number };

// Per-table default: every write to sessions uses 30 minutes unless overridden
const schema = {
  sessions: table<Session>('id').ttl(ttl.minutes(30)),
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
// db.get(), db.getAll(), db.getMany(), db.count(), db.query() all skip expired records.

// Explicit pruning — sweeps all tables, returns count per table
const pruned = await db.pruneExpired();
console.log(pruned); // { sessions: 0 } — none have expired yet

// Prune only specific tables
const partial = await db.pruneExpired(['sessions']);
console.log(partial); // { sessions: 0 }

// Schedule periodic pruning for write-heavy tables
const stop = scheduleExpiredPrune(db, { interval: ttl.hours(1) });

// On app teardown (before dispose)
stop();
db.dispose();
```

#### Checking Expired Record Counts

`debug()` reports live versus expired record counts per table without evicting anything.

```ts
const info = await db.debug();

for (const t of info.tables) {
  console.log(`${t.name}: ${t.recordCount} live, ${t.expiredCount} expired`);
}
```

### Pitfalls

- Expired records are evicted **lazily** on the next read to that key. If a table is written to frequently but rarely read, expired records accumulate. Call `pruneExpired()` or `scheduleExpiredPrune` to reclaim storage proactively.
- `ttl.hours(0)` is valid and means the record expires immediately. The record may still be readable within the same synchronous tick, but will be treated as expired on the next async read.
- On **IndexedDB**, `pruneExpired` uses a cursor-based pass — expired records are deleted without loading their values into memory. On **LocalStorage / SessionStorage** and **Memory**, each key is checked in sequence.
- `scheduleExpiredPrune` uses `setInterval` internally. Call the returned `stop()` function before calling `db.dispose()` when a manual stop is needed. When `dispose()` is called without stopping the schedule first, the next interval tick will receive a `VaultDisposedError` and automatically clear the timer — so no dangling timer will fire after the adapter is torn down.

### Related

- [CRUD](./crud.md)
- [Plugins — metrics and validators](./plugins.md)
- [Usage Guide — Use TTL](/vault/usage.md#use-ttl)
- [API Reference — `scheduleExpiredPrune`](/vault/api.md#scheduleexpiredprune)
