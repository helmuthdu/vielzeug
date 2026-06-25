---
title: Refine — Range Slider (Migration)
description: Migration note for projects using legacy ore-range-slider docs.
---

# Range Slider (Migration)

`ore-range-slider` is **not** part of the current published `@vielzeug/refine` API.

Use [`ore-slider`](./slider.md) instead.

## What To Import

```ts
import '@vielzeug/refine/slider';
```

## What To Render

```html
<ore-slider min="0" max="100" value="30"></ore-slider>
```

## Why This Page Exists

This page is kept as a migration pointer so older links continue to resolve. The canonical slider documentation is:

- [Slider](./slider.md)
- [Refine API Reference](../api.md)
