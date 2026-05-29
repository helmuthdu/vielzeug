---
title: 'Mcp Examples — Reading Docs'
description: 'Reading docs example for @vielzeug/mcp.'
---

## Reading Docs

### Problem

You need the full documentation content for a package page — the usage guide, API reference, or examples — to answer a question or generate code.

### Solution

Call `get-docs` with `packageSlug` and the desired `page`. The `page` defaults to `"index"` if omitted.

#### Default page (index)

```json
{ "name": "get-docs", "arguments": { "packageSlug": "sieve" } }
```

#### Specific page

```json
{ "name": "get-docs", "arguments": { "packageSlug": "sieve", "page": "api" } }
```

Available pages: `index`, `api`, `usage`, `examples`.

#### Source entrypoint

To read `src/index.ts` instead of a documentation page, use the dedicated tool:

```json
{ "name": "get-source", "arguments": { "packageSlug": "sieve" } }
```

### Pitfalls

- `page` only accepts the four doc page values. Passing `"source"` returns `isError: true`; use `get-source` for source access.
- Not every package has every page. Check `availableDocPages` from `list-packages` first to avoid an error on a missing page.
- The returned content is raw Markdown, not HTML. Parse it or pass it directly to a language model.

### Related

- [Listing Packages](./listing-packages.md)
- [Package Metadata](./package-metadata.md)
- [API Reference — get-docs](../api.md#get-docs)
- [API Reference — get-source](../api.md#get-source)
