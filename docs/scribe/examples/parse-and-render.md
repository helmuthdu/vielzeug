---
title: 'Scribe Examples: Parse and Render'
description: 'First steps with @vielzeug/scribe: parse once, render to HTML, DOM, text, and outline.'
---

## Parse and Render

### Problem

You have Markdown (a README fragment, an archive publication, an LLM reply) and need it on
screen as real semantic HTML — without wiring parser + sanitizer + escaping yourself.

### Solution

```ts
import { parseProse, proseOutline, proseToText, renderProseHtml } from '@vielzeug/scribe';

const source = `# Release 2.0

Highlights:

- **Streaming** replies
- Faster cold starts
- ~~Legacy API~~ gone

See the [changelog](/changelog).
`;

const doc = parseProse(source);

// 1. HTML string (SSR / static sites)
console.log(renderProseHtml(doc, { headingIds: true }));

// 2. Plain text (search index, notifications)
console.log(proseToText(doc));

// 3. Table of contents (ids match the HTML above exactly)
console.log(proseOutline(doc));
// [{ level: 1, text: 'Release 2.0', id: 'release-20' }]

// 4. In the browser: build real nodes instead of strings
document.getElementById('article')?.replaceChildren(
  // import { renderProseDom } from '@vielzeug/scribe'
  // document.replaceChildren(renderProseDom(doc))
);
```

In the browser the same doc renders with `renderProseDom(doc)`: a `DocumentFragment` built
exclusively with `createTextNode`/`createElement`, ready for `replaceChildren`.

### Pitfalls

- Setext headings (`Title\n=====`) are not in the profile: the underline renders literally. Use `#` headings.
- A blank line is required before a table or a new block; single newlines inside a paragraph are soft breaks.
- The AST is frozen by design — derive new docs by reparsing, not by mutation.
- `renderProseDom` needs `document`; in Node use `renderProseHtml`.

### Related

- [Usage Guide](../usage.md)
- [Safe Rendering](./safe-rendering.md)
