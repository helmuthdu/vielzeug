---
title: 'Scribe Examples: Safe Rendering for Untrusted Content'
description: 'Rendering hostile or arbitrary Markdown safely: protocol policy, degradation, and limit handling with @vielzeug/scribe.'
---

## Safe Rendering for Untrusted Content

### Problem

User-submitted or model-generated Markdown arrives: it may contain script tags,
`javascript:` links, entity-encoded scheme tricks, or megabytes of nesting. Display it
without ever executing, ever hanging, or ever throwing out of the render path.

### Solution

```ts
import { parseProse, renderProseDom, ScribeError } from '@vielzeug/scribe';

function renderProseSafely(container: HTMLElement, source: string): void {
  try {
    container.replaceChildren(renderProseDom(parseProse(source)));
  } catch (error) {
    if (error instanceof ScribeError) {
      // Oversized or pathologically nested: show the raw source as plain text.
      container.replaceChildren(document.createTextNode(source));
    } else {
      throw error; // never swallow real bugs
    }
  }
}
```

What the pipeline already handles before you catch anything:

```ts
const doc = parseProse(
  '<script>alert(1)</script>\n' +
    '[click](javascript:alert(1))\n' +
    '[sneaky](&#58;javascript:alert(1))\n' +
    '[ok](/relative/page)',
);
// <script>…</script> → escaped text (raw HTML is not in the profile)
// javascript: links → label text "click", dev warning, no anchor ever created
// &#58;javascript:  → entities are decoded BEFORE the policy check: same degradation
// /relative/page    → allowed: relative URLs always render as links
```

Narrow the policy for stricter surfaces (custom allowlist) — anything not listed degrades the
same way:

```ts
const strict = parseProse(source, { linkProtocols: ['https'] }); // no mailto, no exceptions
```

### Pitfalls

- Degradation keeps the **link label**: content is never silently dropped, only un-linked.
- `data:` cannot be allowed even via `linkProtocols` — `data:image/svg+xml` is a script vector.
- The dev warning is compiled out in production builds; if you need reporting, wrap the input
  scan yourself — the policy decision itself never throws.
- On a `ScribeLimitError` fallback, render the source with `textContent` (as above), never
  `innerHTML`.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Refine: Prose component](/refine/components/prose) — the same pipeline as `ore-prose`, themed with Refine tokens
