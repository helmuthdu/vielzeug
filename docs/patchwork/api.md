---
title: 'Patchwork: API Reference'
description: 'Public API of @vielzeug/patchwork: apply, tryApply, diff, pointer helpers, types, and errors.'
---

[[toc]]

## API Overview

| Symbol          | Purpose                                                | Execution | Common gotcha                                                  |
| --------------- | ------------------------------------------------------ | --------- | -------------------------------------------------------------- |
| `apply`         | Immutable RFC 6902 application with structural sharing | Sync      | Throws on unresolvable pointer or failed `test`                |
| `tryApply`      | Same engine, rejection as data                         | Sync      | `error.index` is the failing operation, not the document size  |
| `diff`          | Structural patch from `from` to `to`                   | Sync      | Patch values reference `to`; clone if `to` keeps mutating      |
| `getIn`         | Pointer read                                           | Sync      | Returns `undefined` both for missing and for non-JSON descents |
| `parsePointer`  | Pointer → decoded tokens                               | Sync      | Throws `PatchPathError` on pointers not starting with `/`      |
| `formatPointer` | Tokens → pointer                                       | Sync      | `[]` formats to `''` (the whole document)                      |

## Package Entry Point

```ts
import { apply, diff, getIn, parsePointer, tryApply } from '@vielzeug/patchwork';
import { merge } from '@vielzeug/patchwork/merge'; // three-way merge subpath
```

## Functions

### apply

```ts
function apply<T extends JsonValue>(doc: T, patch: JsonPatch): T;
```

Applies every operation in order, copy-on-write: untouched subtrees keep their identity, and
a fully no-op patch returns `doc` itself. `add` inserts into arrays (index may equal the
length), sets/overwrites object members, and supports `-` append; `remove` and `replace`
require the target to exist; `move` removes the `from` location then adds at `path`; `copy`
adds a `structuredClone`; `test` compares structurally. Values from `add`/`copy` are cloned
into the document.

Throws `PatchPathError` when a pointer does not resolve or an index is out of bounds, and
`PatchTestError` when a `test` operation does not match.

### tryApply

```ts
function tryApply(doc: JsonValue, patch: JsonPatch): ApplyResult;
```

Never throws for patch failures: returns `{ ok: true, doc }` or
`{ ok: false, error: { index, path, reason: 'path' | 'test', message } }`, where `path` is the
exact pointer that failed — for `move`/`copy`, whichever side (source or target) was bad.

### diff

```ts
function diff(from: JsonValue, to: JsonValue): JsonPatch;
```

Computes a patch that turns `from` into `to`. Objects diff per key; arrays align on their
common prefix and suffix, recurse positionally through the middle, and emit ordered removals
and indexed inserts around it (`-` only for true appends); anything else becomes one
`replace` at the deepest shared pointer. The result always round-trips
(`apply(from, diff(from, to))` deep-equals `to`) — verified by a seeded round-trip test.

### getIn / parsePointer / formatPointer

```ts
function getIn(doc: JsonValue, pointer: JsonPointer): JsonValue | undefined;
function parsePointer(pointer: JsonPointer): string[];
function formatPointer(tokens: readonly string[]): JsonPointer;
```

RFC 6901 throughout: `~1` decodes to `/`, `~0` to `~`; the empty pointer is the whole
document. `parsePointer('x')` throws — pointers start with `/` or are empty.

### merge (subpath `@vielzeug/patchwork/merge`)

```ts
function merge(base: JsonValue, local: JsonValue, remote: JsonValue, options?: MergeOptions): MergeResult;
```

Reconciles two diverged copies of `base` field-by-field. Returns `{ doc, conflicts }`:
`doc` applies both sides where they do not collide, and `conflicts` lists every location
where both sides changed the base differently (`{ base, local, path, remote }`, with
`undefined` marking a deleted or never-present side). `options.resolution` picks the winner
(`'remote'` default; `'local'` available) — conflicts are reported either way. Arrays: pure
appends concatenate (local first), pure truncations take the shorter, anything else
conflicts as a whole array. Types `MergeConflict`, `MergeOptions`, and `MergeResult` are
exported from the subpath.

## Types

| Type             | Purpose                                                         |
| ---------------- | --------------------------------------------------------------- |
| `JsonValue`      | The JSON domain: null, boolean, number, string, arrays, objects |
| `JsonObject`     | `{ [key: string]: JsonValue }`                                  |
| `JsonPointer`    | A string RFC 6901 pointer                                       |
| `PatchOperation` | Union of the six RFC 6902 operations                            |
| `JsonPatch`      | `readonly PatchOperation[]`                                     |
| `ApplyResult`    | `{ ok: true, doc } \| { ok: false, error: PatchErrorInfo }`     |
| `PatchErrorInfo` | `{ index, path, reason: 'path' \| 'test', message }`            |

Individual operation types (`AddOperation`, `RemoveOperation`, `ReplaceOperation`,
`MoveOperation`, `CopyOperation`, `TestOperation`) are exported for building typed patch
builders.

## Errors

| Error            | Thrown when                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `PatchError`     | Base class for every patchwork error                                                                                          |
| `PatchPathError` | A pointer does not resolve, an index is out of bounds, or a pointer is malformed; `error.pointer` names the offending pointer |
| `PatchTestError` | A `test` operation did not match the document                                                                                 |
