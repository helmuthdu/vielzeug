---
title: 'Scroll Examples — Basic Fixed-Height List'
description: 'Basic Fixed-Height List examples for scroll.'
---

## Basic Fixed-Height List

### Problem

You need to render thousands of list items efficiently. Every row is the same height, so the offset table can be computed once without measuring individual elements.

### Solution

The simplest case: every row is the same height. The offset table is built once and never needs rebuilding.

```ts
import { createVirtualizer } from '@vielzeug/scroll';

const data = Array.from({ length: 50_000 }, (_, i) => ({ id: i, label: `Item ${i}` }));

const scrollEl = document.getElementById('scroll')!;
const listEl = document.getElementById('list')!;

const virt = createVirtualizer(scrollEl, {
  count: data.length,
  estimateSize: 40,
  onChange: ({ items, totalSize }) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    for (const item of items) {
      const el = document.createElement('div');
      el.className = 'row';
      el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:40px;line-height:40px;padding:0 12px;`;
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

### Pitfalls

- Calling `createVirtualizer` before the scroll container is in the DOM gives it a scroll height of 0, disabling virtualization entirely. Always create it inside `onMounted` or `firstUpdated`.
- Passing a new options object with a different `count` to a second `createVirtualizer` call creates a fresh instance, losing scroll position. Use `virt.update({ count })` for data changes.
- Not setting an explicit `height` on the scroll container makes it expand to fit all rendered rows, removing the scroll and disabling virtualization.

### Related

- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
- [Grouped List (Headers + Rows)](./grouped-list-headers-plus-rows.md)
