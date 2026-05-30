---
title: 'Codex Examples — Listing Packages'
description: 'Listing packages example for @vielzeug/codex.'
---

## Listing Packages

### Problem

You need to discover which Vielzeug packages are available, what documentation pages each one has, and whether source is accessible before calling `get-docs` or `get-source`.

### Solution

Call `list-packages` without arguments to get the full catalog, or pass `packageSlug` to retrieve a single package as a one-item array.

```json
{ "name": "list-packages", "arguments": {} }
```

Result excerpt:

```json
[
  {
    "name": "@vielzeug/ripple",
    "slug": "ripple",
    "version": "3.0.1",
    "description": "Reactive signals, computed, effects, stores",
    "category": "state",
    "exports": ["signal", "computed", "effect"],
    "availableDocPages": ["index", "api", "usage", "examples"],
    "hasSource": true
  }
]
```

#### Filter to one package

Pass `packageSlug` to get a single-item array. The return type is always an array.

```json
{ "name": "list-packages", "arguments": { "packageSlug": "ripple" } }
```

### Pitfalls

- The result never includes `docs` content or `apiSource` — call `get-docs` or `get-source` separately.
- An unknown `packageSlug` returns `isError: true`, not an empty array. Check the available slugs listed in the error before retrying.
- `availableDocPages` varies per package; always check it before calling `get-docs` with a specific page.

### Related

- [Searching Packages](./searching-packages.md)
- [Reading Docs](./reading-docs.md)
- [API Reference — list-packages](../api.md#list-packages)
