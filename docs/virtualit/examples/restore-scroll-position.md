---
title: 'Virtualit Examples — Restore Scroll Position'
description: 'Restore Scroll Position examples for virtualit.'
---

## Restore Scroll Position

### Problem

When a user navigates away from a long virtual list and returns, the list should restore their previous scroll position rather than resetting to the top.

### Solution

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


### Pitfalls

- `scrollToOffset()` is a no-op if the scroll container has not been laid out yet (height is 0). Call it inside `onMounted`/`firstUpdated` or after the next animation frame.
- Saving scroll position on every `scroll` event is expensive. Save only on `scrollend` or before navigation events, not on every pixel of movement.
- Saved offsets are absolute pixel values. If `estimateSize` or the row count changes between sessions, the same offset no longer points to the same logical item. Save the nearest item index instead.

### Related

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
