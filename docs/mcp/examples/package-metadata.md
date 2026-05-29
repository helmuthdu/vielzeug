---
title: 'Mcp Examples — Package Metadata'
description: 'Package metadata example for @vielzeug/mcp.'
---

## Package Metadata

### Problem

You need structured metadata for a specific package — its exports, related packages, available doc pages, and category — to guide further tool calls or code generation.

### Solution

Call `list-packages` with `packageSlug` to get a one-item array of `PackageMeta` for that package.

```json
{ "name": "list-packages", "arguments": { "packageSlug": "courier" } }
```

Result:

```json
[
  {
    "name": "@vielzeug/courier",
    "slug": "courier",
    "version": "3.0.1",
    "description": "Typed HTTP client with caching and mutations",
    "category": "http",
    "keywords": ["http", "fetch", "cache", "mutation"],
    "exports": ["createApi", "createQuery", "createMutation"],
    "related": ["sieve", "ripple", "deposit"],
    "availableDocPages": ["index", "api", "usage", "examples"],
    "hasSource": true
  }
]
```

The result never includes the full `docs` content or `apiSource`. Use `get-docs` and `get-source` to retrieve those.

### Pitfalls

- `PackageMeta` strips `docs`, `apiSource`, and `components` from the full package record. It is a summary, not the complete data.
- `related` contains slugs, not package names. Use them directly as `packageSlug` in subsequent `list-packages` or `get-docs` calls.
- `hasSource: false` means no `src/index.ts` was bundled for this package; `get-source` will return an error for it.

### Related

- [Listing Packages](./listing-packages.md)
- [Reading Docs](./reading-docs.md)
- [API Reference — list-packages](../api.md#list-packages)
