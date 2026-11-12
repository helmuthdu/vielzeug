---
title: 'Patchwork Examples: Optimistic Sync with test Operations'
description: 'Guard patches with test operations so concurrent edits conflict loudly instead of clobbering silently.'
---

## Optimistic Sync with test Operations

### Problem

Two clients edit the same document. "Last write wins with the whole JSON" loses an edit on
every concurrent save, and a lost update is worse than a visible conflict.

### Solution

Send patches, not documents, and make the patch carry its own precondition: the client
prefixes every patch with a `test` on a revision field the server bumps on each write.

```ts
import { tryApply } from '@vielzeug/patchwork';
import type { JsonPatch, JsonObject, JsonValue } from '@vielzeug/patchwork';

function commit(serverDoc: JsonObject, patch: JsonPatch): { doc: JsonObject } | { conflict: true } {
  const result = tryApply(serverDoc, patch);
  if (!result.ok) return { conflict: true }; // the test failed: someone else moved first
  return { doc: { ...(result.doc as JsonObject), rev: (serverDoc.rev as number) + 1 } };
}

// Client side: build the patch against the last-known revision…
const patch: JsonPatch = [
  { op: 'test', path: '/rev', value: 41 },
  { op: 'replace', path: '/address/zip', value: '1020' },
];
```

`tryApply` reports _which_ operation failed and why (`reason: 'test' | 'path'`), so the
server can answer `409` with the operation index instead of a shrug. The client rebases:
re-fetch the document, re-run `diff` against the new state, resend.

### Pitfalls

- The `test` only protects the fields it names; a patch guarded by `/rev` still needs the client's base revision to be the one the server holds — bump `rev` on every accepted write.
- `apply` throws where `tryApply` returns; at a network boundary use `tryApply` so a hostile or stale patch is a reply, not a 500.
- Patches composed from `diff` contain no `test` — the guard is yours to prepend; validation of the _document_ belongs to a [Vault](/vault/) schema, not to the patch.

### Related

- [Usage Guide](../usage.md) — Conflicts as Data
- [API Reference](../api.md)
- [Tandem](/tandem/) for the transport layer around these exchanges
