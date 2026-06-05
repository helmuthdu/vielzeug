---
title: Sigil — Range Slider (Migration)
description: Migration note for projects using legacy sg-range-slider docs.
---

# Range Slider (Migration)

`sg-range-slider` is **not** part of the current published `@vielzeug/sigil` API.

Use [`sg-slider`](./slider.md) instead.

## What To Import

```ts
import '@vielzeug/sigil/slider';
```

## What To Render

```html
<sg-slider min="0" max="100" value="30"></sg-slider>
```

## Why This Page Exists

This page is kept as a migration pointer so older links continue to resolve. The canonical slider documentation is:

- [Slider](./slider.md)
- [Sigil API Reference](../api.md)
