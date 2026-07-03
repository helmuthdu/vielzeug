---
title: 'Codex Examples — Running REPL Examples'
description: 'Discovering and reading runnable REPL examples for @vielzeug/codex.'
---

## Running REPL Examples

### Problem

You want to show a user (or generate code from) a real, runnable snippet for a package instead of
hand-writing one from prose documentation — and want it to be the same snippet Vielzeug ships in
its interactive [REPL](/repl).

### Solution

Call `list-examples` with `packageSlug` to discover available example ids, then `get-example` with
the chosen `exampleId` to read the full runnable code.

#### List available examples

```json
{ "name": "list-examples", "arguments": { "packageSlug": "arsenal" } }
```

Result:

```json
[
  { "id": "function-debounce", "name": "Debouncing rapid calls" },
  { "id": "function-throttle", "name": "Throttling a scroll handler" }
]
```

#### Read one example's code

```json
{ "name": "get-example", "arguments": { "packageSlug": "arsenal", "exampleId": "function-debounce" } }
```

The result is plain JavaScript text, ready to paste into a REPL, a scratch file, or a code block
in a response.

### Pitfalls

- `list-examples` returns `[]` — not an error — for packages with no REPL examples. This is normal
  for DOM-output packages (`ore`, `refine`, `prism`), which have no browser-executable preview
  container. Check `exampleIds` from `list-packages`/`get-package` before assuming a package has
  runnable examples.
- `get-example` requires both `packageSlug` and `exampleId` — passing an `exampleId` that belongs
  to a different package returns `isError: true`, even if that id exists for some other package.
- The returned code is plain JavaScript by convention (not TypeScript), matching what the REPL
  itself ships — don't expect type annotations in the output.

### Related

- [Listing Packages](./listing-packages.md)
- [Searching Packages](./searching-packages.md) — `search-packages` also matches example names/code and reports `matchedExamples`
- [API Reference — list-examples](../api.md#list-examples)
- [API Reference — get-example](../api.md#get-example)
