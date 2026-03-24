---
title: 'Virtualit Examples — Restore Scroll Position'
description: 'Restore Scroll Position examples for virtualit.'
---

## Restore Scroll Position

## Problem

Implement restore scroll position in a production-friendly way with `@vielzeug/virtualit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/virtualit` installed.

Save and restore scroll position using `scrollToOffset()`.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const STORAGE_KEY = 'list-scroll-offset';

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 40,
  onChange: render,
});

// Save offset as the user scrolls
scrollEl.addEventListener(
  'scroll',
  () => {
    sessionStorage.setItem(STORAGE_KEY, String(scrollEl.scrollTop));
  },
  { passive: true },
);

// Restore on page load
const saved = sessionStorage.getItem(STORAGE_KEY);
if (saved) virt.scrollToOffset(Number(saved));
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
