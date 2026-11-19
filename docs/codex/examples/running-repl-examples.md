---
title: 'Codex Examples: Running REPL Examples'
description: 'Reading runnable REPL examples via @vielzeug/codex.'
---

## Running REPL Examples

### Problem

You want a real, runnable snippet for a package instead of hand-writing one from prose, and want it to be the same snippet Vielzeug ships in its interactive [REPL](/repl).

### Solution

`get-package` lists the example ids and names; `get-example` reads one example's full runnable code.

```json
{ "name": "get-package", "arguments": { "slug": "arsenal" } }
```

```json
{ "name": "get-example", "arguments": { "exampleId": "function-debounce", "slug": "arsenal" } }
```

The result is plain JavaScript text, ready to paste into a REPL, a scratch file, or a code block in a response.

### Pitfalls

- `examples` is `[]` for packages with no REPL examples. This is normal for DOM-output packages (`ore`, `refine`, `prism`), which have no browser-executable preview container.
- `get-example` requires both `slug` and `exampleId`: an id from a different package returns `isError: true`.
- The returned code is plain JavaScript by convention (not TypeScript), matching what the REPL itself ships.

### Related

- [Discovering Packages](./discovering-packages.md)
- [Searching Docs](./searching.md)
- [Tool reference](../tools.md)
