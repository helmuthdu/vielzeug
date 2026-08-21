---
title: 'Sentinel Examples — Lazy Load Images on Intersection'
description: Assign an image source when the image approaches the viewport.
---

## Lazy Load Images on Intersection

### Problem

An image should not receive its full source until it approaches the viewport. `createIntersection()` provides normalized intersection state and explicit observer ownership.

### Solution

Observe an image, assign its source once, then release the observer immediately.

```ts
import { createIntersection, SentinelUnavailableError } from '@vielzeug/sentinel';

const image = document.createElement('img');
image.alt = 'Blue placeholder';
image.dataset.src =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360"%3E%3Crect width="100%25" height="100%25" fill="%23007acc"/%3E%3C/svg%3E';
document.body.append(image);

try {
  const intersection = createIntersection(image, { rootMargin: '200px' });
  const unsubscribe = intersection.subscribe(() => {
    if (!intersection.value?.isIntersecting || !image.dataset.src) return;

    image.src = image.dataset.src;
    delete image.dataset.src;
    unsubscribe();
    intersection.dispose();
  });
} catch (error) {
  if (!(error instanceof SentinelUnavailableError)) throw error;
  image.src = image.dataset.src ?? '';
}
```

### Pitfalls

- Use native `loading="lazy"` when it provides enough control.
- Reserve image dimensions to prevent layout shift.
- Dispose after the one-time load to avoid retaining the element.

### Related

- [Intersection API](../api.md#createintersection)
- [MDN: Lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading)
