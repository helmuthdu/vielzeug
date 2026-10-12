---
title: 'Tandem Examples: Make Store Commands Undoable'
description: Layer Ledger undo/redo over the single write path of a synced Vault store.
---

## Make Store Commands Undoable

### Problem

The store already syncs through the single write path ([Sync a Vault Store](./sync-a-vault-store.md)), and the UI reads the records from a reactive mirror. Players expect structural commands — a trade, a craft, a recorded result — to be undoable with Ctrl/Cmd+Z, but undo must not bypass sync: a revert that writes outside the write path never bumps `rev` and silently desyncs.

### Solution

Mirror the tables into a ripple signal, execute every command through the one write path, and record a field-scoped revert with Ledger after the write lands. Undo and redo re-run through the same path, so they bump `rev`, fire the observer, and sync like any other command.

```ts
import { createLedger } from '@vielzeug/ledger';
import { signal } from '@vielzeug/ripple';
import { table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';

interface Doc {
  id: string;
  rev: number;
  title: string;
}

const store = createIndexedDB({
  name: 'app:sync',
  schema: { docs: table<Doc>('id') },
  version: 1,
});

// The reactive mirror: every write — command, undo, redo, remote pull — lands here
// through the table observer, so views never need a second subscription.
const docs = signal<Doc[]>([]);
const stopObserving = store.observe('docs', (rows) => docs.update(() => rows));

// The one write path: bump the revision, persist, let the observer publish.
async function commitDoc(next: Doc): Promise<void> {
  const current = docs.value.find((doc) => doc.id === next.id);
  await store.put('docs', { ...next, rev: (current?.rev ?? 0) + 1 });
}

// Undo history for structural commands; reverts re-run through commitDoc.
const history = createLedger<{ id: string }>({ maxHistory: 24 });

export async function renameDoc(id: string, title: string): Promise<void> {
  const before = docs.value.find((doc) => doc.id === id);
  if (!before) return;

  await commitDoc({ ...before, title });
  history.record({
    apply: () => {
      void commitDoc({ ...before, title });
    },
    label: `rename ${id}`,
    meta: { id },
    revert: () => {
      void commitDoc(before);
    },
  });
}

export async function undoLastCommand(): Promise<void> {
  await history.undo();
}

export async function redoLastCommand(): Promise<void> {
  await history.redo();
}
```

### Pitfalls

- Reverts and redos must go through the same write path: a revert that patches the mirror in place skips the `rev` bump and the sync never sees the undone state.
- Capture the previous field values before the command runs; a revert that restores a whole earlier record snapshot can overwrite a concurrent change from another tab. When a snapshot revert is unavoidable, guard it on the record's `rev` and refuse when the record moved on.
- Give the ledger a `maxHistory` bound: undo depth is a product decision, not unbounded memory.
- Stop the table observer when the store closes (an account switch disposes one database and opens the next); a stale observer publishes rows from the wrong account.

### Related

- [Sync a Vault Store](./sync-a-vault-store.md): the gateway and write path this builds on.
- [Ledger: Compose Reversible Commands](/ledger/usage.md#compose-reversible-commands)
- [Vault: Observe a Table](/vault/usage.md#observe-a-table)
