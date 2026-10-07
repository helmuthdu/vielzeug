---
title: 'Tandem: Offline-first sync engine'
description: Offline-first sync engine with rev baselines, tombstoned deletions, and idle-batched pushes for browser applications.
package: tandem
category: sync
keywords: [sync, offline, conflict, tombstone, rev, replication, last-write-wins]
related: [vault, postmaster, sentinel, ripple]
exports: [createSync, SyncPort, SyncGateway, SyncHandle, TandemEvent, TandemError, TandemDisposedError]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="tandem" />

## Why Tandem?

A local-first app keeps its records in IndexedDB but must still reach a server: batch bursts of edits into one upload, propagate deletions that a plain pull would resurrect, and reconcile two devices that edited the same record while offline. Tandem drives that round trip against any backend, tracking a per-record write counter so a push carries only what actually changed.

```ts
// Before
// Hand-rolled: debounce each save, POST the whole table, hope deletions survive.
let timer;
function onSave(record) {
  clearTimeout(timer);
  timer = setTimeout(() => fetch('/sync', { method: 'POST', body: JSON.stringify(allRecords()) }), 3000);
}

// After
import { createSync } from '@vielzeug/tandem';

const sync = createSync({ gateway, port, idleDelayMs: 3000 });
sync.changed(); // a local edit happened: the engine batches and pushes dirty records
```

| Feature                              | Tandem                                     | RxSync              | PowerSync            |
| ------------------------------------ | ------------------------------------------ | ------------------- | -------------------- |
| Bundle size                          | <PackageInfo package="tandem" type="size" /> | <ore-icon name="x" size="16" /> | <ore-icon name="x" size="16" /> |
| Zero runtime dependencies            | <ore-icon name="check" size="16" />        | <ore-icon name="x" size="16" /> | <ore-icon name="x" size="16" /> |
| Backend-agnostic (bring your `port`) | <ore-icon name="check" size="16" />        | <ore-icon name="x" size="16" /> | <ore-icon name="x" size="16" /> |
| Storage-agnostic (bring your `gateway`) | <ore-icon name="check" size="16" />     | <ore-icon name="x" size="16" /> | <ore-icon name="check" size="16" /> |
| Tombstoned deletions + rev conflicts | <ore-icon name="check" size="16" />        | <ore-icon name="check" size="16" /> | <ore-icon name="check" size="16" /> |

<div class="decision-callout">

**Use `tandem` when** you already own a local store and a backend and want the sync scheduler: dirty tracking, batching, hide-flows, and conflict reconcile: without adopting a database or a server.

**Consider `PowerSync` when** you want a managed sync service with its own SQLite client and server component rather than a scheduler over your existing storage.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/tandem
```

```sh [npm]
npm install @vielzeug/tandem
```

```sh [yarn]
yarn add @vielzeug/tandem
```

:::

## Quick Start

Implement the two seams: a `SyncPort` for the server and a `SyncGateway` for local storage: then start the scheduler. Records are opaque to Tandem; it reads only `id` and `rev`, and every rev comparison is the engine's: the gateway upserts, validates, and tombstones.

```ts
import { createSync, type SyncGateway, type SyncPort } from '@vielzeug/tandem';

const port: SyncPort = {
  pull: (since) => fetch(`/sync?since=${since ?? ''}`).then((r) => r.json()),
  push: async (records, deletions) => {
    const response = await fetch('/sync', { method: 'POST', body: JSON.stringify({ records, deletions }) });
    if (!response.ok) throw new Error(await response.text()); // divergence → the engine pulls to reconcile
  },
};

const gateway: SyncGateway = {
  records: () => localRecords.map((record) => ({ entity: 'docs', record })),
  pendingDeletions: () => readTombstones(),
  applyRecords: (pulled) => upsert(pulled), // the engine pre-filters; you validate untrusted records
  applyDeletions: (deletions) => removeLocal(deletions),
  clearDeletions: (deletions) => dropTombstones(deletions),
  loadState: () => readSyncState(),
  saveState: (state) => writeSyncState(state),
};

const sync = createSync({ gateway, port });
sync.tap((event) => console.debug('sync', event)); // observe pushes, pulls, warnings
myStore.subscribe(() => sync.changed()); // a local write happened

// On account switch or teardown: after flushing this account's work:
await sync.flush();
sync.dispose();
```

## Features

<div class="features-grid">

- **`createSync()`**: drives a port against a gateway with a serialized push queue.
- **`SyncPort`**: the server seam: `pull(since)` and `push(records, deletions)`.
- **`SyncGateway`**: the storage seam: upserts, tombstones, and the persisted baseline: the engine owns every rev comparison.
- **`rev` baselines**: a record is dirty exactly when its rev is above the last-synced one, across reloads.
- **`changed()`**: wire it to your write path; the engine debounces a burst into one push.
- **`flush()`**: a full cycle on demand: pull remote changes, then push dirty records; rejects on failure.
- **Hide-flows**: flushes with `keepalive` on `pagehide`/`hidden`, runs a full cycle on return to the foreground.
- **`tap()`**: typed `TandemEvent`s for pushes, pulls, invalid records, and warnings.
- **Lifecycle-owned**: `dispose()`, `disposed`, `disposalSignal`, and `[Symbol.dispose]`; post-dispose `changed()`/`flush()` fail with `TandemDisposedError`.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Vault](/vault/): the typed storage core most gateways wrap; its IndexedDB adapter is a natural `records()`/`applyRecords()` backend.
- [Postmaster](/postmaster/): the durable outbox half of offline sync; pair it with Tandem for at-least-once mutations alongside state sync.
- [Sentinel](/sentinel/): subscribable browser state; its network signal can gate when you call `flush()`.
- [Ripple](/ripple/): signals and effects; `store.subscribe(() => sync.changed())` is the usual wiring.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
