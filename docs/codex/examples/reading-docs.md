---
title: 'Codex Examples — Reading Docs'
description: 'Reading docs example for @vielzeug/codex.'
---

## Reading Docs

### Problem

You need the full documentation content for a package page — the usage guide, API reference, or examples — to answer a question or generate code.

### Solution

Call `get-docs` with `packageSlug` and the desired `page`. The `page` defaults to `"index"` if omitted.

#### Default page (index)

```json
{ "name": "get-docs", "arguments": { "packageSlug": "spell" } }
```

#### Specific page

```json
{ "name": "get-docs", "arguments": { "packageSlug": "spell", "page": "api" } }
```

Available pages: `index`, `api`, `usage`, `examples`.

#### Source entrypoint

To read `src/index.ts` instead of a documentation page, use the dedicated tool:

```json
{ "name": "get-source", "arguments": { "packageSlug": "spell" } }
```

When you only need one exported symbol's declaration rather than the full file, use
`get-type-signature` instead — it returns just that declaration:

```json
{ "name": "get-type-signature", "arguments": { "slug": "spell", "symbol": "createSchema" } }
```

### Pitfalls

- `page` only accepts the four doc page values. Passing `"source"` returns `isError: true`; use `get-source` for source access.
- Not every package has every page. Check `availableDocPages` from `list-packages` first to avoid an error on a missing page.
- The returned content is raw Markdown, not HTML. Parse it or pass it directly to a language model.
- `get-type-signature` only finds symbols actually exported from `src/index.ts` (directly or via `export * from`) — it never matches inherited `Object.prototype` member names like `"toString"` or `"constructor"`, even though those exist on every JS object.

### Related

- [Listing Packages](./listing-packages.md)
- [Package Metadata](./package-metadata.md)
- [API Reference — get-docs](../api.md#get-docs)
- [API Reference — get-source](../api.md#get-source)
- [API Reference — get-type-signature](../api.md#get-type-signature)
