---
title: 'Patchwork: RFC 6902 JSON Patch'
description: 'RFC 6902 JSON Patch: structural diff, immutable apply, and guarded tryApply for sync protocols.'
package: patchwork
category: utilities
keywords: [json-patch, rfc-6902, rfc-6901, json-pointer, diff, patch, sync, collaboration, immutable]
exports: [apply, tryApply, diff, getIn, parsePointer, formatPointer]
related: [tandem, forge, vault]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="patchwork" />

## Why Patchwork?

Once two places hold the same document, sending the whole document is the lazy answer that
scales worst: bandwidth grows with document size, not with what changed, and blind writes
clobber concurrent edits. JSON Patch is the wire format for the honest answer, and Patchwork
implements it with the two properties sync code actually needs: `apply` is **immutable with
structural sharing** (untouched subtrees keep their object identity, so React and every memo
layer work for free), and `diff` is **structural** (objects diff field-by-field, append-only
arrays stay one operation).

```ts
import { apply, diff } from '@vielzeug/patchwork';

const patch = diff(before, after); // [{ op: 'replace', path: '/user/address/zip', value: '1010' }]
const next = apply(before, patch); // before untouched; next.user.address is new, next.user.orders === before.user.orders
```

A failed `test` operation is an ordinary answer in protocol code, not an exception:
`tryApply` returns `{ ok: false, error: { index, path, reason } }`, so conflict handling is
data you can log and reply to. Zero runtime dependencies, spec-exact pointers (`~0`/`~1`
escaping, `-` append), and a browser-safe build.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/patchwork
```

```sh [npm]
npm install @vielzeug/patchwork
```

```sh [yarn]
yarn add @vielzeug/patchwork
```

:::

## Quick Start

```ts
import { apply, diff, tryApply } from '@vielzeug/patchwork';

const doc = { items: ['a'], title: 'Cart' };
const patch = diff(doc, { items: ['a', 'b'], title: 'Wagen' });
// [{ op: 'add', path: '/items/-', value: 'b' }, { op: 'replace', path: '/title', value: 'Wagen' }]

const next = apply(doc, patch); // doc untouched; next.title changed, next.items is a new array (it grew)

tryApply(doc, [{ op: 'test', path: '/title', value: 'Other' }, ...patch]);
// { ok: false, error: { index: 0, reason: 'test', path: '/title', message: … } }
```

## Features

<div class="features-grid">

- **`apply`**: immutable RFC 6902 — all six operations, copy-on-write with structural sharing.
- **`tryApply`**: the same engine as data; a failed `test` or bad pointer returns a structured rejection with the failing operation index.
- **`diff`**: per-field object patches, suffix-trimmed arrays (appends cost a single `add`), pointer-escaped keys.
- **Pointer API**: `parsePointer`/`formatPointer` with `~0`/`~1` escaping and `getIn` for reads.
- **Spec-exact edges**: `null` is a value not an absence, `replace` requires an existing target, array `add` inserts, `-` appends.
- **Input isolation**: `add`/`copy` values are cloned in, so the caller's objects can never mutate a document afterwards.
- **Hard JSON domain**: numbers, strings, booleans, null, arrays, objects — no functions, no prototypes, nothing to inherit.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Tandem](/tandem/): transports patches over the wire in sync protocols.
- [Forge](/forge/): tracks the dirty fields whose changes become patches.
- [Vault](/vault/): schemas that define what a patchable document may contain.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
