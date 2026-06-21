---
title: 'Codex Examples — Package Metadata'
description: 'Package metadata example for @vielzeug/codex.'
---

## Package Metadata

### Problem

You need structured metadata for a specific package — its exports, related packages, available doc pages, and category — to guide further tool calls or code generation.

### Solution

Call `get-package` with `packageSlug` to get a single `PackageMeta` object for that package.

```json
{ "name": "get-package", "arguments": { "packageSlug": "courier" } }
```

Result:

```json
{
  "name": "@vielzeug/courier",
  "slug": "courier",
  "version": "3.0.1",
  "description": "Typed HTTP client with caching and mutations",
  "category": "http",
  "keywords": ["http", "fetch", "cache", "mutation"],
  "exports": ["createApi", "createQuery", "createMutation"],
  "related": ["spell", "ripple", "vault"],
  "availableDocPages": ["index", "api", "usage", "examples"],
  "hasSource": true
}
```

`PackageMeta` never includes full `docs` content or `apiSource`. Use `get-docs` and `get-source` to retrieve those.

### Pitfalls

- `PackageMeta` strips `docs`, `apiSource`, and `components` from the full package record. It is a summary, not the complete data.
- `related` contains slugs, not package names. Use them directly as `packageSlug` in subsequent `get-package` or `get-docs` calls.
- `hasSource: false` means no `src/index.ts` was bundled for this package; `get-source` will return `isError: true` for it.
- An unknown `packageSlug` returns `isError: true` with available slugs listed — not an empty object.

### Related

- [Listing Packages](./listing-packages.md)
- [Reading Docs](./reading-docs.md)
- [API Reference — get-package](../api.md#get-package)
