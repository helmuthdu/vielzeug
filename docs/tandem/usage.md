---
title: 'Tandem: Usage Guide'
description: 'How to drive offline sync with @vielzeug/tandem: ports, gateways, rev baselines, tombstones, and reconciliation.'
---

[[toc]]

## Basic Usage

Tandem sits between your storage and your server. You implement two interfaces and call `createSync`; the engine handles batching, dirty tracking, hide-flows, and conflict reconcile.

```ts
import { createSync, type SyncGateway, type SyncPort } from '@vielzeug/tandem';

interface Doc {
  id: string;
  rev: number;
  title: string;
}

const port: SyncPort<Doc> = {
  async pull(since) {
    return fetch(`/sync/pull?since=${since ?? ''}`).then((response) => response.json());
  },
  async push(records, deletions, options) {
    const response = await fetch('/sync/push', {
      body: JSON.stringify({ records, deletions }),
      headers: { 'Content-Type': 'application/json' },
      keepalive: options?.keepalive,
      method: 'POST',
    });
    if (!response.ok) throw new Error(`server diverged: ${await response.text()}`);
  },
};

const gateway: SyncGateway<Doc> = {
  records: () => docs.map((record) => ({ entity: 'docs', record })),
  pendingDeletions: () => readTombstones(),
  async applyRecords(pulled) {
    // The engine already filtered these to records the server is ahead on;
    // validate the untrusted remotes and upsert the rest.
    const skipped: string[] = [];
    for (const { record } of pulled) {
      if (!isValid(record)) skipped.push(record.id);
      else upsert(record);
    }
    return skipped;
  },
  applyDeletions: (deletions) => Promise.all(deletions.map((d) => remove(d.id))),
  clearDeletions: (deletions) => Promise.all(deletions.map((d) => dropTombstone(d.id))),
  loadState: () => readRow('syncState'),
  saveState: (state) => writeRow('syncState', state),
};

const sync = createSync<Doc>({ gateway, port });
```

## Track Dirty Records with Revs

Tandem never diffs record contents. Each record carries a `rev` counting its committed writes, and the gateway persists a baseline of the newest rev the server has seen. A record is dirty exactly when its current rev is above that baseline.

```ts
// Your write path bumps the rev on every committed change.
function saveDoc(id: string, patch: Partial<Doc>): void {
  const current = docs.find((doc) => doc.id === id)!;
  upsert({ ...current, ...patch, rev: current.rev + 1 });
  sync.changed(); // schedule a flush
}
```

Because the baseline is persisted, dirtiness survives a reload: a record edited while offline is still above the baseline when the app restarts, and the boot sequence pushes it. The engine never asks your gateway to compare revs: ahead, dirty, and deletion precedence are all its decisions.

## Propagate Deletions with Tombstones

A plain pull cannot carry a deletion: the record is gone. Record a tombstone when you delete locally; Tandem pushes it and clears it only once the server acknowledges.

```ts
function deleteDoc(id: string): void {
  remove(id);
  writeTombstone({ deletedAt: new Date().toISOString(), entity: 'docs', id });
  sync.changed();
}
```

A remote deletion loses to a local record with unpushed changes: if your local rev is above the baseline, Tandem keeps your edit and pushes it instead of applying the deletion. The guard runs both ways: a pulled record whose id is locally tombstoned, or deleted in the same pull, never applies, so a backend without an incremental cursor cannot resurrect your deletions.

## Batch Changes and Flush

Call `changed()` on every local write. The engine debounces a burst into one push after `idleDelayMs` (default 3000), and serializes pushes so two never overlap.

```ts
const sync = createSync({ gateway, idleDelayMs: 1500, port });

// Force a full cycle now: on a save button, or before navigating away.
try {
  await sync.flush();
} catch {
  // the cycle failed: edits stay local and dirty; the next cycle retries them
}
```

`flush()` pulls remote changes and then pushes dirty records, so it is also the wiring point for a returning network connection. It rejects when either half fails; the records stay dirty and the next cycle retries them. After `dispose()`, `flush()` rejects with `TandemDisposedError` and `changed()` throws it: a leaked scheduler fails loudly instead of silently stopping. If your reactive wiring can fire after disposal, unsubscribe from your store before disposing the handle, or guard with `sync.disposed`.

Tandem also flushes on its own: it pushes with `keepalive: true` when the tab hides or closes, and runs a full cycle when the tab returns to the foreground. Serve the keepalive push with `navigator.sendBeacon` or a `keepalive` fetch so it survives the tab closing.

## Reconcile a Rejected Push

When the server is ahead of the lineage you pushed, reject the push. Tandem immediately pulls to reconcile, then the next flush retries with the merged state. Ambient flushes (debounce, hide) report the failure as a `warning` event; `flush()` additionally rejects with the port's error.

```ts
async push(records, deletions) {
  const response = await fetch('/sync/push', { body: JSON.stringify({ records, deletions }), method: 'POST' });
  if (response.status === 409) throw new Error('server ahead'); // triggers a reconcile pull
}
```

## Observe with tap()

`tap()` is the observation seam: pushes, pulls, refused records, and warnings. Handler errors are swallowed, so an observer never breaks sync.

```ts
const unsubscribe = sync.tap((event) => {
  switch (event.type) {
    case 'push':
    case 'pull':
      console.debug(`sync ${event.type}: ${event.records} records`);
      break;
    case 'invalid':
      console.warn(event.message, event.skipped);
      break;
    case 'warning':
      console.warn(event.message, event.error); // push rejected, network failure, etc.
      break;
  }
});
```

## Lifecycle and Disposal

Dispose before switching accounts: the baseline is per-account state and a running scheduler would push into the wrong port.

```ts
const sync = createSync({ gateway, port });
// ...
sync.dispose(); // stops the scheduler, clears the timer, removes document/window listeners
```

`disposed` and `disposalSignal` report the state; `[Symbol.dispose]` lets you scope it with `using`.

```ts
{
  using sync = createSync({ gateway, port });
  sync.changed();
} // disposed here
```

## Testing

Drive the engine against in-memory doubles. A `SyncPort` double records pushes and returns scripted pulls; a `SyncGateway` double is a record array plus a tombstone list plus a state row.

```ts
import { createSync } from '@vielzeug/tandem';

const pushes: unknown[][] = [];
const port: SyncPort = {
  pull: async () => ({ cursor: null, deletions: [], records: [] }),
  push: async (records, deletions) => void pushes.push([records, deletions]),
};

const sync = createSync({ gateway: fakeGateway, idleDelayMs: 10, port });
await vi.waitFor(() => expect(pushes.length).toBe(1)); // startup push
sync.dispose();
```

## Framework Integration

Tandem is framework-neutral. Wire `changed()` to your reactive layer and `dispose()` to the component or scope lifecycle.

::: code-group

```ts [Vue 3]
import { onScopeDispose, watch } from 'vue';

const sync = createSync({ gateway, port });
watch(store.records, () => sync.changed(), { deep: true });
onScopeDispose(() => sync.dispose());
```

```tsx [React]
import { useEffect, useRef } from 'react';

const syncRef = useRef(createSync({ gateway, port }));
useEffect(() => {
  const sync = syncRef.current;
  return () => sync.dispose();
}, []);
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  const sync = createSync({ gateway, port });
  $effect(() => { $records; sync.changed(); });
  onDestroy(() => sync.dispose());
</script>
```

:::

## Working with Other Vielzeug Libraries

- **Vault**: the usual `gateway` backend. Its IndexedDB adapter stores records and the sync-state row; `records()` reads them from storage (it may be async), `applyRecords()` writes through the codec.
- **Postmaster**: complementary, not overlapping. Postmaster guarantees at-least-once delivery of discrete mutations; Tandem keeps whole-record state in step. Apps that need both run them side by side.
- **Sentinel**: subscribe to `createNetwork()` and call `sync.flush()` when the connection returns; the cycle pulls and pushes, so remote changes land without waiting for the next foreground return.
- **Ripple**: `store.subscribe(() => sync.changed())` is the idiomatic wiring for a signal-backed store.

## Best Practices

- Bump `rev` on every committed write: the whole dirty model depends on it.
- Validate remote records in `applyRecords()` and return the ids you refuse; never trust a pulled record.
- Keep `records()` free of remote session mirrors: it must return only this device's own records.
- Dispose on account switch; a stale scheduler pushes into the wrong port.
- Serve `keepalive` pushes with `sendBeacon` or a `keepalive` fetch so they survive tab close.
- Reject a push on divergence instead of silently overwriting; let the reconcile pull merge.
- Persist the sync-state row per account, alongside the records it describes.
- Call `flush()` before actions that assume both sides are current, such as a share or export, and handle its rejection.
