---
title: 'Virtualit Examples — Basic Fixed-Height List'
description: 'Basic Fixed-Height List examples for virtualit.'
---

## Basic Fixed-Height List

## Problem

Implement basic fixed-height list in a production-friendly way with `@vielzeug/virtualit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/virtualit` installed.

The simplest case: every row is the same height. The offset table is built once and never needs rebuilding.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const data = Array.from({ length: 50_000 }, (_, i) => ({ id: i, label: `Item ${i}` }));

const scrollEl = document.getElementById('scroll')!;
const listEl = document.getElementById('list')!;

const virt = createVirtualizer(scrollEl, {
  count: data.length,
  estimateSize: 40,
  onChange: (virtualItems, totalSize) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.className = 'row';
      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:40px;line-height:40px;padding:0 12px;`;
      el.textContent = data[item.index].label;
      listEl.appendChild(el);
    }
  },
});
```

```html
<div id="scroll" style="height:400px;overflow:auto;position:relative;">
  <div id="list" style="position:relative;"></div>
</div>
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

- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
- [Grouped List (Headers + Rows)](./grouped-list-headers-plus-rows.md)
