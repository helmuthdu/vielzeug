---
title: 'Virtualit Examples — Keyboard Navigation'
description: 'Keyboard Navigation examples for virtualit.'
---

## Keyboard Navigation

## Problem

Implement keyboard navigation in a production-friendly way with `@vielzeug/virtualit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/virtualit` installed.

Track a focused index and use `scrollToIndex` with `align: 'auto'` so only out-of-view items trigger a scroll.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const rows = Array.from({ length: 1_000 }, (_, i) => `Row ${i}`);
let focusedIndex = 0;

function paint(items = virt.getVirtualItems(), totalSize = virt.getTotalSize()) {
  listEl.style.height = `${totalSize}px`;
  listEl.innerHTML = '';

  for (const item of items) {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:36px;`;
    el.style.background = item.index === focusedIndex ? 'var(--highlight)' : '';
    el.textContent = rows[item.index];
    listEl.appendChild(el);
  }
}

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 36,
  onChange: paint,
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
