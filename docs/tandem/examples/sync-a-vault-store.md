---
title: 'Tandem Examples — Sync a Vault Store'
description: Wire Tandem's gateway to a Vault IndexedDB store so saved records reach the server.
---

## Sync a Vault Store

### Problem

The app already persists records with Vault and mirrors them into memory. You need those records to reach a backend without rewriting the store or diffing record contents on every save.

### Solution

Express the store as a `SyncGateway`: `records()` reads the in-memory mirror, `applyRecords()` writes through the codec, and the sync-state row holds the baseline. Bump `rev` in the single write path so dirtiness is a counter comparison — the engine owns the comparisons, the gateway just upserts.

```ts
import { createSync, type SyncGateway, type SyncPort } from '@vielzeug/tandem';
import { type DocumentVaultStore, table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';

interface Doc {
  id: string;
  rev: number;
  title: string;
}
type SyncStateRow = { cursor: string | null; id: 'app'; revs: Record<string, number> };

const store: DocumentVaultStore<{ docs: ReturnType<typeof table>; syncState: ReturnType<typeof table> }> =
  createIndexedDB({
    name: 'app:sync',
    schema: { docs: table<Doc>('id'), syncState: table<SyncStateRow>('id') },
    version: 1,
  });

let mirror: Doc[] = [];
store.observe('docs', (rows) => {
  mirror = rows;
  sync.changed(); // any write — local or remote — schedules a flush
});

const gateway: SyncGateway<Doc> = {
  records: () => mirror.map((record) => ({ entity: 'docs', record })),
  pendingDeletions: async () => [],
  async applyRecords(pulled) {
    // Already filtered to records the server is ahead on — validate and upsert.
    const skipped: string[] = [];
    for (const { record } of pulled) {
      try {
        await store.put('docs', record);
      } catch {
        skipped.push(record.id); // remote records are untrusted
      }
    }
    return skipped;
  },
  applyDeletions: async (deletions) => {
    for (const { id } of deletions) await store.delete('docs', id);
  },
  clearDeletions: async () => {},
  loadState: async () => {
    const row = await store.get('syncState', 'app');
    return row ? { cursor: row.cursor, revs: row.revs } : null;
  },
  saveState: async (state) => {
    await store.put('syncState', { ...state, id: 'app' });
  },
};

const sync = createSync<Doc>({ gateway, port });

function saveDoc(id: string, title: string): void {
  const current = mirror.find((doc) => doc.id === id);
  void store.put('docs', { id, rev: (current?.rev ?? 0) + 1, title });
}
```

### Pitfalls

- Bump `rev` in the one write path every command uses; a write that skips the counter never syncs.
- Keep `records()` reading the local mirror only — a remote session mirror must never be pushed as this device's state.
- Observe the table rather than calling `changed()` at each call site, so cross-tab writes sync too.

### Related

- [Usage Guide — Track Dirty Records with Revs](../usage.md#track-dirty-records-with-revs)
- [Vault](/vault/) — the storage core behind the gateway.
- [Keep Deletions from Resurrecting](./keep-deletions-from-resurrecting.md)
