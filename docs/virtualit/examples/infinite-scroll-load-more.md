---
title: 'Virtualit Examples — Infinite Scroll (Load More)'
description: 'Infinite Scroll (Load More) examples for virtualit.'
---

## Infinite Scroll (Load More)

## Problem

Implement infinite scroll (load more) in a production-friendly way with `@vielzeug/virtualit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/virtualit` installed.

Detect when the user scrolls near the end and load the next page. Update `count` to append new items seamlessly.

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
  virt.count = items.length;
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
      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:40px;line-height:40px;padding:0 12px;`;
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

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
