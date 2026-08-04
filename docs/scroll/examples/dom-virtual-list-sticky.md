---
title: Sticky Items in DOM Virtual List
description: Mark certain items as sticky headers using the sticky option in createDomVirtualList.
---

## Sticky Items in DOM Virtual List

### Problem

Keep section headers visible while a DOM virtual list scrolls without rendering every list item.

### Solution

Pass a `sticky` predicate to `createDomVirtualList` (or `createVirtualScroller`). Sticky items arrive in `stickyItems` inside the `render` callback.

```ts
import { createDomVirtualList } from '@vielzeug/scroll';

type Row = { id: number; label: string; isHeader: boolean };

const ctrl = createDomVirtualList<Row>({
  scrollElement: scrollEl,
  listElement: listEl,
  estimateSize: (_, row) => (row.isHeader ? 40 : 32),
  // Mark header rows as sticky
  sticky: (_, row) => row.isHeader,
  render({ items, stickyItems, listEl, recycle, totalSize }) {
    listEl.style.height = `${totalSize}px`;

    // Render sticky header overlay (floats above list)
    if (stickyItems[0]) {
      const sticky = stickyItems[0];
      const el = recycle('sticky', () => {
        const div = document.createElement('div');
        div.className = 'sticky-header';
        return div;
      });
      el.style.cssText = `position:sticky;top:0;z-index:10;height:${sticky.size}px;`;
      el.textContent = sticky.data.label;
      // Attach el above listEl in your own overlay container
    }

    // Render normal rows
    for (const item of items) {
      const el = recycle(item.data.id, () => document.createElement('div'));
      el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:${item.size}px;`;
      el.textContent = item.data.label;
      listEl.appendChild(el);
    }
  },
});

ctrl.setItems(rows);
```

### Pitfalls

- Render sticky headers in an overlay, not inside `listEl`.
- Give sticky rows an accurate size estimate to avoid visible position jumps.

### Related

- [Scroll Usage Guide](../usage.md)
- [Scroll API Reference](../api.md)
