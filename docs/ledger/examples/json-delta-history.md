---
title: 'Ledger Examples: JSON Delta History'
description: 'Carry reversible JSON-document edits as @vielzeug/patchwork patches with @vielzeug/ledger.'
---

## JSON Delta History

### Problem

The reversible state is a JSON document (a shared config, a form payload, a game entity) and
you want history entries that are small, serializable, and transportable — closures over
captured snapshots cannot be persisted to storage or shipped to peers, and whole-document
snapshots per command grow with document size instead of change size.

### Solution

Model each command as a JSON Patch plus its inverse. `apply` and `revert` stay two-line
functions; the history entries themselves are plain JSON, so they can be logged, stored, or
forwarded — and patchwork's copy-on-write `apply` makes even the untouched paths free.

```ts
import { createLedger } from '@vielzeug/ledger';
import { apply, diff, type JsonPatch, type JsonValue } from '@vielzeug/patchwork';

type Doc = { [key: string]: JsonValue };

const ledger = createLedger<{ label: string }>();
let doc: Doc = { budget: { coffee: 12 }, title: 'Roadmap', votes: [] };

/** Records `patch` as a reversible command; forward+inverse patches are plain JSON. */
async function edit(patch: JsonPatch, label: string): Promise<void> {
  const next = apply(doc, patch);
  if (next === doc) return; // no-op: nothing to remember
  const inverse = diff(next, doc);
  await ledger.do({
    apply: () => {
      doc = apply(doc, patch);
    },
    label,
    meta: { label },
    revert: () => {
      doc = apply(doc, inverse);
    },
  });
}

await edit([{ op: 'replace', path: '/budget/coffee', value: 15 }], 'coffee budget');
await edit([{ op: 'add', path: '/votes/-', value: 'lgtm' }], 'vote');
await ledger.undo(); // drops the vote; the budget edit stays
```

Local edits do not need hand-written patches — `diff` computes the forward patch, which
doubles as the payload you can broadcast to collaborators (a `tavern` guest applies the same
patch, so history and wire format are one artifact):

```ts
await edit(diff(doc, { ...doc, title: 'Roadmap v2' }), 'rename');
```

### Pitfalls

- Compute the inverse against the exact document the command runs on (before submitting), not
  lazily inside `revert`; Ledger serializes execution, but a lazily captured inverse reverts
  against whatever `doc` is by then.
- A command reverting after external mutation throws `PatchPathError` because its pointers no
  longer resolve. Either let the UI surface that as "history invalidated", or prefix
  submitted patches with a `{ op: 'test', path: '/rev', … }` operation — see the patchwork
  usage guide for the lock pattern.
- Keep `Doc` inside the JSON domain: `Date`, `undefined`, maps, and functions must be encoded
  (or validated away with [Spell](/spell/)) before they reach the document.
- Skip no-ops (`apply` returns the same reference when nothing changed): a history full of
  empty patches makes undo feel broken.
- If you never need to persist or ship history, storing the previous document reference
  (`revert: () => { doc = before; }`) is cheaper than storing inverse patches, because
  structural sharing makes the old root nearly free to keep.

### Related

- [Form History](./form-history.md)
- [Text Editor History](./text-editor.md)
- [Ledger Usage Guide](../usage.md)
- [Patchwork Usage Guide](/patchwork/usage)
