---
title: 'Scroll Examples — Keyboard Navigation'
description: 'Keyboard Navigation examples for scroll.'
---

## Keyboard Navigation

### Problem

Users should be able to move focus through list items with the arrow keys. The virtualizer must scroll only when the focused item is outside the visible area — not on every keypress.

### Solution

Track a focused index and use `scrollToIndex` with `align: 'auto'` so only out-of-view items trigger a scroll.

```ts
import { createVirtualizer } from '@vielzeug/scroll';

const rows = Array.from({ length: 1_000 }, (_, i) => `Row ${i}`);
let focusedIndex = 0;

function paint(items = virt.items, totalSize = virt.totalSize) {
  listEl.style.height = `${totalSize}px`;
  listEl.innerHTML = '';

  for (const item of items) {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:36px;`;
    el.style.background = item.index === focusedIndex ? 'var(--highlight)' : '';
    el.textContent = rows[item.index];
    listEl.appendChild(el);
  }
}

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 36,
  onChange: ({ items, totalSize }) => paint(items, totalSize),
});

scrollEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    focusedIndex = Math.min(focusedIndex + 1, rows.length - 1);
    virt.scrollToIndex(focusedIndex, { align: 'auto' });
    paint(); // update highlight even if visible range did not change
  } else if (e.key === 'ArrowUp') {
    focusedIndex = Math.max(focusedIndex - 1, 0);
    virt.scrollToIndex(focusedIndex, { align: 'auto' });
    paint();
  }
});
```

---

### Pitfalls

- `scrollToIndex` with `align: 'auto'` only scrolls when the item is outside the visible area. On first render, the virtualizer may not have rendered the focused item yet, making the initial scroll a no-op.
- Arrow key events only fire if the scroll container or a child has focus. If focus is on the document body, key events do not reach the container's listener. Ensure the container has `tabindex="0"`.
- Removing `tabindex` from the scroll container or its items breaks keyboard focus. The container must remain focusable for key events to fire.

### Related

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
