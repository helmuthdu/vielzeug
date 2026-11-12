---
title: 'Scribe: Usage Guide'
description: 'How to use @vielzeug/scribe: parsing, the language profile, rendering to HTML and DOM, link policy, and the security model.'
---

[[toc]]

## Basic Usage

Parse Markdown into a frozen AST once, then render it as many times as you like into any of
four shapes:

```ts
import { parseProse, proseOutline, proseToText, renderProseDom, renderProseHtml } from '@vielzeug/scribe';

const doc = parseProse('# Hello\n\nShip **today**.');

renderProseHtml(doc); // string (SSR, VitePress, archive publications)
renderProseDom(doc); // DocumentFragment (client replaces, refine ore-prose)
proseToText(doc); // plain text (search, notifications, a11y)
proseOutline(doc); // [{ level: 1, text: 'Hello', id: 'hello' }]
```

`renderProseDom` builds nodes exclusively with `document.createElement` and
`document.createTextNode` — the DOM path cannot inject markup at all. It requires a live
`document`; in Node use `renderProseHtml`.

## The Language Profile

Scribe implements a fixed CommonMark + GFM subset — the same on every platform and every
release:

| Feature      | Notes                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Headings     | ATX (`#`–`######`) only; setext underlines render literally                                                |
| Emphasis     | `*`, `**`, `***`, `_`, `__` with CommonMark flanking rules (`snake_case` is safe); `~~strikethrough~~`     |
| Code         | Fenced (``` / `~~~`, info string preserved as `lang`), indented (4 spaces), backtick spans                 |
| Blocks       | Paragraphs, blockquotes, thematic breaks, hard breaks (`two spaces` or `\`)                                |
| Lists        | `-`/`+`/`*` bullets and `1.` ordered; strict last-marker nesting; simplified tight/loose rule              |
| Tables       | GFM pipes with alignment row; a table must start on its own line                                           |
| Links/images | Inline links with optional titles, images with alt text; autolinks and bare www URLs; GFM autoliteral URLs |
| Task lists   | `[ ]`/`[x]` items render a **disabled** checkbox (never interactive)                                       |

Deliberately absent: raw HTML and entities (rendered as inert text), reference link
definitions, setext headings, lazy list continuation, definition lists, footnotes, math.

## HTML and DOM Rendering

### Headings with ids

```ts
import { parseProse, renderProseHtml } from '@vielzeug/scribe';

const doc = parseProse('# Guide\n\n# Guide');

renderProseHtml(doc, { headingIds: true });
// <h1 id="guide">Guide</h1><h1 id="guide-2">Guide</h1>
```

`proseOutline` runs the same slugger over the full doc, so its `id` values always match the
ids the renderer emits for the same document.

### DOM vs HTML

Both renderers produce identical structures. Choose by surface:

```ts
// Node / static site: a string you embed in a page
const html = renderProseHtml(parseProse(source), { headingIds: true });

// Browser: real nodes for replaceChildren — no innerHTML, no sanitizer needed
article.replaceChildren(renderProseDom(parseProse(source), { headingIds: true }));
```

## Link Policy

Every link destination and image src passes a protocol allowlist **after** control-character
stripping and numeric entity decoding (so `&#58;javascript:` degrades like the direct form):

```ts
import { parseProse, renderProseHtml } from '@vielzeug/scribe';

const doc = parseProse('[a](javascript:alert(1)) [b](https://ok.test) [c](/relative)');

renderProseHtml(doc);
// <p>a <a href="https://ok.test">b</a> <a href="/relative">c</a></p>
//  ↑ rejected link degraded to its label text
```

Default allowlist is `http`, `https`, `mailto`; `data:` can never be allowed
(`data:image/svg+xml` carries scripts). Relative and protocol-relative (`//host`)
destinations always pass — they carry no scheme. Override with:

```ts
parseProse(source, { linkProtocols: ['https'] });
```

Degradation keeps the link **label** (or image **alt**) as plain text — content is never
silently dropped — and a dev-mode warning names the rejected destination.

## Outline and Plain Text

```ts
import { parseProse, proseOutline, proseToText } from '@vielzeug/scribe';

const doc = parseProse('# Intro\n\nText\n\n## Setup\n\nMore text.');

proseOutline(doc); // [{ level: 1, text: 'Intro', id: 'intro' }, …]
proseOutline(doc, { maxLevel: 2 }); // shallow TOC for sidebars
proseToText(doc); // "Intro\nText\nSetup\nMore text." for search & alerts
```

Outline `id`s are produced by the same slugger the renderer uses with `headingIds`, so TOC
anchors resolve against the rendered HTML with no extra bookkeeping. `proseToText` keeps code
content and drops formatting, links, and images.

## Error Handling

Only two throw paths exist:

```ts
import { parseProse, ScribeError, ScribeLimitError } from '@vielzeug/scribe';

try {
  parseProse(megabyteOfMarkdown); // > 200_000 characters
} catch (error) {
  if (error instanceof ScribeLimitError) console.error(error.reason, error.limit);
}
```

`ScribeError` is the base class; `ScribeLimitError` covers the input size cap and the
nesting-depth cap (32). Anything malformed degrades to literal text instead of throwing —
unclosed emphasis, dangling fences, and broken tables all render as readable prose.

## Refine Integration

`@vielzeug/refine` ships [`<ore-prose>`](/refine/components/prose), which wraps this
pipeline with Refine theme tokens:

```html
<ore-prose markdown="# Hello\n\nRendered with **Refine** tokens."></ore-prose>
```

It re-emits `ScribeError` as an `error` event and falls back to the source's plain text.

## Best Practices

1. **Parse once, render many.** The AST is frozen; keep it and re-render instead of reparsing the same source.
2. **`headingIds` on both sides.** When you build a TOC with `proseOutline`, enable `headingIds` in the renderer, or the anchors match nothing.
3. **Don't post-process the HTML with `innerHTML`.** If you need different semantics, walk the AST instead — the renderers are the safety boundary; re-parsing your own edits through `innerHTML` reopens the hole they close. `[VERIFY]`
4. **Keep hostile input under the caps.** A `ScribeLimitError` is the signal to reject the input at your boundary, not to retry with a bigger limit.
