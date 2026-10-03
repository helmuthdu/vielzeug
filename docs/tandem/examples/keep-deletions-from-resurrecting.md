---
title: 'Tandem Examples: Keep Deletions from Resurrecting'
description: Tombstone local deletions and let unpushed edits win over remote deletions.
---

## Keep Deletions from Resurrecting

### Problem

A record deleted on device A must disappear from device B. But if device B edited that record while offline, blindly applying A's deletion destroys B's unsent work, and a naive pull can resurrect records that were deleted elsewhere.

### Solution

Write a tombstone on every local delete so the deletion rides the next push, and rely on Tandem's built-in precedence: a remote deletion is skipped for any local record whose rev is above the baseline (dirty), and the local edit pushes instead. The engine also never applies a pulled record whose id is locally tombstoned or deleted in the same pull, so even a backend with no incremental cursor cannot resurrect a deletion.

```ts
import { createSync, type SyncDeletion, type SyncGateway, type SyncPort, type SyncRecordBase } from '@vielzeug/tandem';

interface Doc extends SyncRecordBase {
  title: string;
}

let docs: Doc[] = [];
let tombstones: SyncDeletion[] = [];
const removeLocal = (id: string): void => {
  docs = docs.filter((doc) => doc.id !== id);
};

function deleteDoc(id: string): void {
  removeLocal(id);
  tombstones.push({ deletedAt: new Date().toISOString(), entity: 'docs', id });
  sync.changed();
}

const gateway: SyncGateway<Doc> = {
  records: () => docs.map((record) => ({ entity: 'docs', record })),
  async applyRecords(pulled) {
    // Already filtered to records the server is ahead on and not locally tombstoned.
    for (const { record } of pulled) {
      docs = [...docs.filter((doc) => doc.id !== record.id), record];
    }
    return [];
  },
  async applyDeletions(deletions) {
    for (const { id } of deletions) removeLocal(id);
  },
  async clearDeletions(deletions) {
    // Only the tombstones this push carried: new deletions during the flight survive.
    const gone = new Set(deletions.map((deletion) => `${deletion.entity}:${deletion.id}`));
    tombstones = tombstones.filter((tombstone) => !gone.has(`${tombstone.entity}:${tombstone.id}`));
  },
  loadState: () => readSyncState(), // your storage: the persisted baseline row
  async pendingDeletions() {
    return [...tombstones];
  },
  saveState: (state) => writeSyncState(state), // your storage
};

const port: SyncPort<Doc> = {
  pull: (since) => fetch(`/sync?since=${since ?? ''}`).then((response) => response.json()),
  push: async (records, deletions) => {
    const response = await fetch('/sync', { body: JSON.stringify({ records, deletions }), method: 'POST' });
    if (!response.ok) throw new Error('server diverged');
  },
};

const sync = createSync<Doc>({ gateway, port });
// A remote deletion of a dirty local record is skipped by the engine;
// the local edit reaches the server on the next push and wins.
```

### Pitfalls

- Persist tombstones with your records: an in-memory list loses deletions across reloads and the record resurrects on the next pull.
- Clear tombstones only for the deletions the acknowledged push carried; clearing the whole list races deletions made during the flight.
- The server must apply deletions idempotently: the same tombstone can be pushed twice if the ack was lost.

### Related

- [Usage Guide: Propagate Deletions with Tombstones](../usage.md#propagate-deletions-with-tombstones)
- [Postmaster](/postmaster/): at-least-once delivery for the push itself when the network is flaky.
- [Sync a Vault Store](./sync-a-vault-store.md)
