---
title: 'Scribe: safe Markdown prose'
description: 'Safe Markdown prose: deterministic parser, XSS-safe DOM and HTML renderers, outline and plain-text extraction'
package: scribe
category: utilities
keywords: [markdown, prose, rendering, xss, sanitizer, content, chat, streaming, table-of-contents]
exports: [parseProse, renderProseHtml, renderProseDom, proseToText, proseOutline, ScribeError, ScribeLimitError]
related: [refine, archive]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="scribe" />

## Why Scribe?

Rendering Markdown someone else wrote is a security decision. The usual stack pairs a parser
that happily passes raw HTML through with a sanitizer bolted on afterward — one forgotten
`innerHTML` and the bolt is worthless. Scribe makes safety a property of construction instead:
raw HTML is **not** part of the language, text reaches the DOM only through
`createTextNode`/`createElement`, and no attribute is ever sourced from the document except
policy-checked `href`/`src`. There is no sanitizer step to forget because there is no unsafe
path to take.

```ts
// Before: parser + sanitizer + escape hatch
import { marked } from 'marked';
import DOMPurify from 'dompurify';
container.innerHTML = DOMPurify.sanitize(marked.parse(userText)); // two libs, one memory

// After: one fixed-profile pipeline, safe by construction
import { parseProse, renderProseDom } from '@vielzeug/scribe';
container.replaceChildren(renderProseDom(parseProse(userText))); // zero deps, no innerHTML
```

The profile is a fixed, deterministic GFM-flavored subset — headings, lists, code, tables,
emphasis, links, images, autolinks, strikethrough — with deliberate, documented limits: no
raw HTML, reference links, setext headings, entities, or plugin system. Chat bubbles, archive
publications, and documentation excerpts are exactly the prose this covers.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/scribe
```

```sh [npm]
npm install @vielzeug/scribe
```

```sh [yarn]
yarn add @vielzeug/scribe
```

:::

## Quick Start

```ts
import { parseProse, proseOutline, renderProseHtml } from '@vielzeug/scribe';

const doc = parseProse('# Setup\n\nRun **install** first.\n\n## Configure\n\nEdit the config.');

console.log(renderProseHtml(doc, { headingIds: true }));
// <h1 id="setup">Setup</h1>
// <p>Run <strong>install</strong> first.</p>
// <h2 id="configure">Configure</h2>
// <p>Edit the config.</p>

console.log(proseOutline(doc)); // TOC ids match the ids above, exactly
```

## Features

<div class="features-grid">

- **`parseProse`**: frozen, serializable AST from a fixed GFM-flavored profile — no raw HTML, no plugins, deterministic output.
- **`renderProseHtml`**: escaped HTML string for SSR, static sites, and tests.
- **`renderProseDom`**: `DocumentFragment` built with DOM APIs only — markup-lookalike content renders as visible characters.
- **`proseToText`**: plain text for notifications, search indexing, and previews.
- **`proseOutline`**: top-level headings with slug ids that match the renderers exactly.
- **Policy-checked links**: relative/`http`/`https`/`mailto` pass, `javascript:`/`data:` degrade to label text with a dev warning — never a crash, never an anchor.
- **Hard limits**: oversized or pathologically nested input fails fast with `ScribeLimitError` instead of hanging.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Refine](/refine/): `ore-prose` renders Markdown with this pipeline and Refine typography.
- [Archive](/archive/): publishes the prose that Scribe renders.
- [Spell](/spell/): validation for the structured payloads around the prose.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
