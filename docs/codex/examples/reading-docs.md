---
title: 'Codex Examples: Reading Docs'
description: 'Docs pages, sections, and type signatures example for @vielzeug/codex.'
---

## Reading Docs

### Problem

You need the documentation for a package page: ideally only the part that answers the question, not the whole page.

### Solution

Call `get-docs` with `slug` and `page`. Add `section` to get one heading's slice instead of the full page.

#### Whole page

```json
{ "name": "get-docs", "arguments": { "page": "api", "slug": "spell" } }
```

#### One section

`section` accepts the heading text or its slug (as returned by `search`):

```json
{ "name": "get-docs", "arguments": { "page": "usage", "section": "Composition", "slug": "ripple" } }
```

Nested pages use their path: `{ "slug": "refine", "page": "components/button" }`.

#### One exported symbol's declaration

When you only need a symbol's declaration rather than prose, use `get-type-signature`. The result is the real declaration text with its JSDoc, resolved through the TypeScript checker at snapshot time:

```json
{ "name": "get-type-signature", "arguments": { "slug": "spell", "symbol": "createSchema" } }
```

### Pitfalls

- `page` is a docs path, not one of a fixed enum: check `pages` from `get-package` for what exists.
- The returned content is raw Markdown, not HTML.
- `get-type-signature` only finds symbols exported from the package's `src/index.ts`; it never matches `Object.prototype` names like `"toString"`.
- An unknown `section` returns `isError: true` with the page's section headings listed: pick one and retry.

### Related

- [Discovering Packages](./discovering-packages.md)
- [Searching Docs](./searching.md)
- [Tool reference](../tools.md)
