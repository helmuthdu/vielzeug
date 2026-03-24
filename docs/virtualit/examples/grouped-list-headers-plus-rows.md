---
title: 'Virtualit Examples — Grouped List (Headers + Rows)'
description: 'Grouped List (Headers + Rows) examples for virtualit.'
---

## Grouped List (Headers + Rows)

## Problem

Implement grouped list (headers + rows) in a production-friendly way with `@vielzeug/virtualit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/virtualit` installed.

Flatten groups into a linear renderable list, then pass a per-index estimator to predict header vs. row heights.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

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

      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;`;

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
