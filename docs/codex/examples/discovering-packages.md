---
title: 'Codex Examples: Discovering Packages'
description: 'Package discovery and metadata example for @vielzeug/codex.'
---

## Discovering Packages

### Problem

You need to find which Vielzeug package owns a capability and what documentation, examples, and exports it has, before reading anything.

### Solution

Call `list-packages` for the compact catalog (name, slug, description for every package), then `get-package` with the `slug` for one package's full summary.

```json
{ "name": "list-packages", "arguments": {} }
```

Result excerpt:

```json
[
  { "description": "Reactive signals, computed, effects, and stores", "name": "@vielzeug/ripple", "slug": "ripple" }
]
```

```json
{ "name": "get-package", "arguments": { "slug": "ripple" } }
```

Result excerpt:

```json
{
  "examples": [{ "id": "signal-basics", "name": "Reactive basics" }],
  "exports": ["computed", "effect", "signal"],
  "meta": { "category": "state", "keywords": ["signals", "reactivity"], "name": "@vielzeug/ripple", "related": ["necromancer"], "slug": "ripple", "version": "26.11.24" },
  "pages": [{ "page": "index", "title": "Ripple" }, { "page": "api", "title": "Ripple API" }]
}
```

### Pitfalls

- The summary never includes page bodies or example code: call `get-docs` or `get-example` separately.
- `pages` lists paths relative to the package's docs directory; nested pages look like `components/button`. Pass them to `get-docs` verbatim.
- An unknown `slug` returns `isError: true` with the available slugs listed. Check before retrying.

### Related

- [Searching Docs](./searching.md)
- [Reading Docs](./reading-docs.md)
- [Tool reference](../tools.md)
