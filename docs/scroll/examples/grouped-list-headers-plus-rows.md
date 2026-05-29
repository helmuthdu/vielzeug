---
title: 'Scroll Examples — Grouped List (Headers + Rows)'
description: 'Grouped List (Headers + Rows) examples for scroll.'
---

## Grouped List (Headers + Rows)

### Problem

Your data is organized into named groups, each with a header row followed by its items. The list must render headers and rows in a single virtualized pass, with different heights for each type.

### Solution

Flatten groups into a linear renderable list, then pass a per-index estimator to predict header vs. row heights.

```ts
import { createVirtualizer } from '@vielzeug/scroll';

type FlatRow = { type: 'header'; label: string } | { type: 'row'; data: { id: number; name: string } };

const flatList: FlatRow[] = [
  { type: 'header', label: 'A' },
  { type: 'row', data: { id: 1, name: 'Alice' } },
  { type: 'row', data: { id: 2, name: 'Adam' } },
  { type: 'header', label: 'B' },
  { type: 'row', data: { id: 3, name: 'Bob' } },
];

const virt = createVirtualizer(scrollEl, {
  count: flatList.length,
  estimateSize: (i) => (flatList[i].type === 'header' ? 32 : 44),
  onChange: (virtualItems, totalSize) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    for (const item of virtualItems) {
      const row = flatList[item.index];
      const el = document.createElement('div');

      el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;`;

      if (row.type === 'header') {
        el.className = 'group-header';
        el.style.height = '32px';
        el.textContent = row.label;
      } else {
        el.className = 'row';
        el.style.height = '44px';
        el.textContent = row.data.name;
      }

      listEl.appendChild(el);
    }
  },
});
```

---


### Pitfalls

- The `estimateSize` function is called during layout. Avoid expensive per-index lookups inside it — pre-compute header vs. row type into the flat index array during data preparation.
- If a header renders at the same DOM height as rows but `estimateSize` returns a different value, the layout desynchronizes and rows drift from their expected positions.
- Mutating the groups array in place without calling `update({ count })` leaves the virtualizer showing the previous item count. Always call `update` after data changes.

### Related

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
