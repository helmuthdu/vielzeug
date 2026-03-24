---
title: Buildit — Range Slider (Migration)
description: Migration note for projects using legacy bit-range-slider docs.
---

# Range Slider (Migration)

`bit-range-slider` is **not** part of the current published `@vielzeug/buildit` API.

Use [`bit-slider`](./slider.md) instead.

## What To Import

```ts
import '@vielzeug/buildit/slider';
```

## What To Render

```html
<bit-slider min="0" max="100" value="30"></bit-slider>
```

## Why This Page Exists

This page is kept as a migration pointer so older links continue to resolve. The canonical slider documentation is:

- [Slider](./slider.md)
- [Buildit API Reference](../api.md)
