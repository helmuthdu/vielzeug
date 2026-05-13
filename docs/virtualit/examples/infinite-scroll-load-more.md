---
title: 'Virtualit Examples — Infinite Scroll (Load More)'
description: 'Infinite Scroll (Load More) examples for virtualit.'
---

## Infinite Scroll (Load More)

### Problem

The full dataset is too large to load at once. As the user scrolls near the bottom, the next page should be fetched and appended — extending the list without remounting it.

### Solution

Detect when the user scrolls near the end and load the next page. Update `count` through `update()` to append new items seamlessly.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const PAGE_SIZE = 50;
let items: string[] = Array.from({ length: PAGE_SIZE }, (_, i) => `Item ${i}`);
let loading = false;

async function loadMore() {
  if (loading) return;
  loading = true;
  await new Promise((r) => setTimeout(r, 500)); // simulate API call
  const start = items.length;
  items = [...items, ...Array.from({ length: PAGE_SIZE }, (_, i) => `Item ${start + i}`)];
  virt.update({ count: items.length });
  loading = false;
}

const virt = createVirtualizer(scrollEl, {
  count: items.length,
  estimateSize: 40,
  onChange: (virtualItems, totalSize) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:40px;line-height:40px;padding:0 12px;`;
      el.textContent = items[item.index] ?? 'Loading…';
      listEl.appendChild(el);
    }

    // Trigger next page load when the last item is in view
    const lastRendered = virtualItems.at(-1);
    if (lastRendered && lastRendered.index >= items.length - 10) {
      loadMore();
    }
  },
});
```

---


### Pitfalls

- Off-by-one in the scroll-end check (`>` vs `>=`) causes a double-trigger or a missed trigger at the boundary. Verify the comparison against `count - threshold`, not `count - 1`.
- Not gating the load with an `isLoading` flag triggers duplicate fetches when the user is near the bottom while a request is in flight.
- After loading the last page, `update({ count })` with the same count as before does not trigger a re-render. Handle the "all pages loaded" state explicitly and stop observing scroll.

### Related
- [CRUD Operations (Fetchit)](/fetchit/examples/crud-operations)
- [Polling (Fetchit)](/fetchit/examples/polling)

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
