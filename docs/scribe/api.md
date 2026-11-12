---
title: 'Scribe: API Reference'
description: 'Public API of @vielzeug/scribe: parser, renderers, outline, text extraction, types, and errors.'
---

[[toc]]

## API Overview

| Symbol            | Purpose                                      | Execution | Common gotcha                                                       |
| ----------------- | -------------------------------------------- | --------- | ------------------------------------------------------------------- |
| `parseProse`      | Markdown string → frozen `ProseDoc` AST      | Sync      | Fixed profile: raw HTML, entities, reference links are literal text |
| `renderProseHtml` | AST → escaped HTML string                    | Sync      | No heading `id`s unless `headingIds: true`                          |
| `renderProseDom`  | AST → `DocumentFragment` built with DOM APIs | Sync      | Needs a DOM; pass the doc, not its blocks                           |
| `proseToText`     | AST → plain text                             | Sync      | Links keep labels, images keep alt text                             |
| `proseOutline`    | Headings with ids, renderer order            | Sync      | Nested headings count in the slug sequence, matching the renderer   |

## Package Entry Point

| Import             | Purpose                    |
| ------------------ | -------------------------- |
| `@vielzeug/scribe` | Complete public Scribe API |

## Functions

### `parseProse(markdown, options?)`

Parses the fixed GFM-flavored profile (see the Usage Guide) into a frozen `ProseDoc`.
Link/image destinations are policy-checked here: relative URLs always pass, `data:` always
fails, other schemes require membership in `options.linkProtocols` (default
`['http', 'https', 'mailto']`). A rejected destination becomes the label/alt text plus a
dev-only warning — parsing never throws for a bad URL.

```ts
const doc = parseProse('Read the [guide](/scribe/).');
```

- **Throws** `ScribeLimitError` beyond 200,000 characters or 32 nesting levels.

### `renderProseHtml(doc, options?)` → `string`

Escapes every dynamic value; emits only the fixed tag set. `options.headingIds` adds unique
slug ids matching `proseOutline`.

### `renderProseDom(doc, options?)` → `DocumentFragment`

DOM construction only (`createTextNode`/`createElement`/`setAttribute`): content can never
execute. Requires a browser environment. Same options and id behavior as the string renderer.

### `proseToText(doc)` → `string`

Plain text: blocks separated by blank lines, list markers preserved, links reduced to labels.
For notifications, search indexing, and previews.

### `proseOutline(doc, options?)` → `readonly ProseOutlineEntry[]`

Headings as `{ level, text, id }` in document order — the same traversal and slug sequence the
renderers use with `headingIds`, including headings nested in blockquotes and lists.
`options.maxLevel` (1–6) filters entries without shifting the slug sequence, so ids keep
matching the rendered document.

## Types

The AST is public: safe to branch on, cache, and cross worker boundaries (frozen, serializable).

| Type                                                                                                                                                      | Purpose                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `ProseDoc`                                                                                                                                                | `{ blocks }`: the parsed document                 |
| `ProseBlock`                                                                                                                                              | Union of block nodes (paragraph, heading, list …) |
| `ProseInline`                                                                                                                                             | Union of inline nodes (text, link, codeSpan …)    |
| `ProseParagraph`, `ProseHeading`, `ProseCodeBlock`, `ProseBlockquote`, `ProseList`, `ProseListItem`, `ProseThematicBreak`, `ProseTable`, `ProseTableCell` | Block variants                                    |
| `ProseText`, `ProseCodeSpan`, `ProseStrong`, `ProseEmphasis`, `ProseStrikethrough`, `ProseLink`, `ProseImage`, `ProseSoftBreak`, `ProseHardBreak`         | Inline variants                                   |
| `ProseParseOptions`, `ProseRenderOptions`, `ProseOutlineOptions`                                                                                          | Option bags                                       |
| `ProseOutlineEntry`, `ProseHeadingLevel`, `ProseAlignment`                                                                                                | Outline entry, `1–6`, table alignment             |

## Errors

| Error              | Thrown by      | Meaning                                         |
| ------------------ | -------------- | ----------------------------------------------- |
| `ScribeError`      | — (base class) | Narrow with `instanceof` for any scribe failure |
| `ScribeLimitError` | `parseProse`   | Input exceeds the size or nesting limit         |
