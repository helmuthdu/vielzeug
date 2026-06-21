---
title: 'Codex Examples — Listing Packages'
description: 'Listing packages example for @vielzeug/codex.'
---

## Listing Packages

### Problem

You need to discover which Vielzeug packages are available, what documentation pages each one has, and whether source is accessible before calling `get-docs` or `get-source`.

### Solution

Call `list-packages` without arguments to get the full catalog. To fetch a single entry, use `get-package` with `packageSlug`.

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

#### Fetch a single package

Use `get-package` with `packageSlug` to fetch one entry by slug. Returns a `PackageMeta` object (not an array).

```json
{ "name": "get-package", "arguments": { "packageSlug": "ripple" } }
```

### Pitfalls

- The result never includes `docs` content or `apiSource` — call `get-docs` or `get-source` separately.
- For `get-package`, an unknown `packageSlug` returns `isError: true` with available slugs listed. Check before retrying.
- `availableDocPages` varies per package; always check it before calling `get-docs` with a specific page.

### Related

- [Searching Packages](./searching-packages.md)
- [Reading Docs](./reading-docs.md)
- [API Reference — list-packages](../api.md#list-packages)
- [API Reference — get-package](../api.md#get-package)
