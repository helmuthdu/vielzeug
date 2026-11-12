---
title: 'Patchwork Examples: Diff and Apply'
description: 'First steps with @vielzeug/patchwork: compute a patch, apply it immutably, and read documents with pointers.'
---

## Diff and Apply

### Problem

You have two versions of a JSON document — before and after an edit — and need to ship only
what changed, apply changes without mutating shared state, and read fields by path.

### Solution

`diff` computes the patch, `apply` replays it, `getIn` reads through pointers:

```ts
import { apply, diff, getIn } from '@vielzeug/patchwork';

const before = { address: { city: 'Vienna', zip: '1010' }, items: ['a'], rev: 1 };
const after = { address: { city: 'Vienna', zip: '1020' }, items: ['a', 'b'], rev: 2 };

const patch = diff(before, after);
// [{ op: 'replace', path: '/address/zip', value: '1020' },
//  { op: 'add', path: '/items/-', value: 'b' },
//  { op: 'replace', path: '/rev', value: 2 }]

const next = apply(before, patch); // `before` is still the old document, unchanged
getIn(next, '/address/zip'); // '1020'
next.address !== before.address; // the branch that changed is new…
next.items !== before.items; //   …and untouched branches (none here) keep identity
```

Patches are plain JSON, so they can be sent as-is and logged verbatim:

```ts
JSON.parse(JSON.stringify(patch)); // survives the wire unchanged
```

### Pitfalls

- Pointers start with `/` (or are empty for the whole document); `getIn(doc, 'address')` is a malformed pointer and throws.
- `replace` requires the target to exist — to upsert, use `add`, which sets-or-overwrites on objects.
- The patch returned by `diff` references values inside `to`; if you keep mutating `to`, serialize or clone the patch first.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Optimistic Sync recipe](./optimistic-sync.md)
