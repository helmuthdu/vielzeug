---
title: 'Patchwork: Usage Guide'
description: 'How to use @vielzeug/patchwork: applying patches, conflicts with tryApply, structural diff, pointers, and the JSON domain.'
---

[[toc]]

## Basic Usage

A patch is just an array of operations — build them by hand or compute them with `diff`, then
apply them immutably:

```ts
import { apply, diff } from '@vielzeug/patchwork';

const cart = { items: [{ qty: 1, sku: 'a' }], meta: { rev: 7 }, total: '99' };
const edited = { items: [{ qty: 3, sku: 'a' }], meta: { rev: 8 }, total: '99' };

const patch = diff(cart, edited);
// [{ op: 'replace', path: '/items/0/qty', value: 3 }, { op: 'replace', path: '/meta/rev', value: 8 }]

const next = apply(cart, patch);
next !== cart; // a new document
next.total === cart.total; // untouched subtrees keep their identity, so memoized
next.items !== cart.items; //   selectors recompute only over the branches that changed
```

`apply` returns the same reference when a patch is a no-op (`[]`, or a `replace` with an
equal value), so `Object.is(before, after)` is a reliable "did anything change" check.

## Reading and Pointers

```ts
import { formatPointer, getIn, parsePointer } from '@vielzeug/patchwork';

getIn(cart, '/items/0/sku'); // 'a'
getIn(cart, '/items/9'); // undefined — reads never throw
parsePointer('/a~1b/c~0d'); // ['a/b', 'c~d']
formatPointer(['a/b', 'c~d']); // '/a~1b/c~0d'
```

`null` is a value, not an absence: `getIn({ a: null }, '/a')` is `null`, while
`getIn({ a: null }, '/b')` is `undefined`.

## Conflicts as Data

In collaborative code a rejected patch is a normal message, not a crash. `apply` throws
(`PatchPathError` for unresolvable pointers, `PatchTestError` for failed `test` operations);
`tryApply` returns the same outcome as data:

```ts
import { tryApply } from '@vielzeug/patchwork';

const result = tryApply(doc, [
  { op: 'test', path: '/rev', value: 41 }, // client last saw rev 41
  { op: 'replace', path: '/title', value: 'New' },
]);

if (!result.ok) {
  // { index: 0, path: '/rev', reason: 'test', message: … } — reply "conflict, rebase on rev 42"
}
```

Guarding a write with a leading `test` is the whole optimistic-concurrency protocol: the
server `tryApply`s, and a failed test means someone else moved first.

## What diff Emits

- **Objects**: per-key `remove`s, `add`s, and recursive descent — changed fields cost one small operation each, regardless of document size.
- **Arrays**: the common prefix and suffix are aligned and the middle walked positionally; appends become a single `{ op: 'add', path: '/x/-' }`, prepends and middle inserts a single indexed `add`, and surplus entries become ordered index removes.
- **Different types or root changes**: one `replace` at the shared ancestor — patches stay short and always apply cleanly.

`diff` optimizes for apply-safety and small steady-state payloads (edit-one-field,
append-one-row), which is exactly the traffic of form autosaves, live documents, and audit
trails. It is not an attempt at minimal-edit-count: reordering an array yields positional
replaces, which are correct, just not clever.

## Three-Way Merge (Subpath)

When two copies of a document diverge from a common ancestor, `@vielzeug/patchwork/merge`
reconciles them field-by-field instead of one side overwriting the other:

```ts
import { merge } from '@vielzeug/patchwork/merge';

const base = { price: 10, title: 'Doc', tags: ['a'] };
const local = { price: 10, title: 'My edit', tags: ['a', 'mine'] };
const remote = { price: 12, title: 'Doc', tags: ['a', 'theirs'] };

const { doc, conflicts } = merge(base, local, remote);
// doc:      { price: 12, title: 'My edit', tags: ['a', 'mine', 'theirs'] }
// conflicts: []  — only same-field collisions conflict
```

The policy is deliberately conservative: objects merge key-by-key to any depth, a delete
beats an untouched copy, both sides only appending an array concatenates (local first), and
both sides only truncating takes the shorter result. Anything else — a mid-list array edit,
an append versus a truncate, different additions to the same key — is reported in
`conflicts` and resolved by `options.resolution` (`'remote'` default, `'local'` opt-in),
never guessed. Ship the merged doc back to either side as an ordinary patch with
`diff(side, doc)`.

This module is policy, not RFC 6902: the core entry point stays spec-only on purpose.

## The JSON Domain

Documents are JSON: `null`, booleans, numbers, strings, arrays, and plain objects. `apply`
clones every incoming `add`/`copy` value (`structuredClone`), so objects you built the patch
from can be mutated freely afterwards without touching the document. `diff` treats the two
documents read-only and never clones what it returns — `value`s in the patch point into `to`,
so freeze `to` (or clone the patch) if you intend to keep mutating it.

## Error Handling

All errors extend `PatchError`. `apply` throws at the first failing operation and leaves
nothing behind (it builds the next document copy-on-write, so a throw discards it).
`PatchErrorInfo.path` names the pointer the failing operation targeted — for `move`/`copy`
that is the `from` location when the source was missing.

## Best Practices

- Use `tryApply` at network boundaries and `apply` in pure local code — exceptions are for programmer errors, rejections are for protocol answers.
- Prefix state-changing patches with a `{ op: 'test', path: '/rev', … }` operation instead of shipping whole documents; the patch is the lock.
- Keep patches in your logs as data (they are JSON): replaying `apply` over an old snapshot reconstructs exactly what was sent.
- Do not feed non-JSON values (functions, `undefined`, `Date`) through `apply`; validate documents with [Vault](/vault/) schemas at the edge and the domain stays clean.
- In a sync engine, merge on the server with `{ resolution: 'remote' }` and show the `conflicts` array to the user — silent wins are how sync tools lose trust.
