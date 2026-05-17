---
title: 'Virtualit Examples — Variable Height with Measurement'
description: 'Variable Height with Measurement examples for virtualit.'
---

## Variable Height with Measurement

### Problem

Row heights vary based on content (e.g., multi-line text, embedded images). The virtualizer cannot compute offsets upfront — it must accept measured heights reported after each row renders.

### Solution

Report exact heights after rendering using `measure()`. All measurement calls within a single tick are coalesced into one rebuild.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

type Message = { id: number; content: string };
const messages: Message[] = [
  /* ... */
];

const virt = createVirtualizer(scrollEl, {
  count: messages.length,
  estimateSize: 64, // rough estimate — actual heights vary
  onChange: (virtualItems, totalSize) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.dataset.index = String(item.index);
      el.className = 'message';
      el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;padding:8px;`;
      el.textContent = messages[item.index].content;
      listEl.appendChild(el);
    }

    // Measure after layout — batched into one rebuild
    requestAnimationFrame(() => {
      for (const item of virtualItems) {
        const el = listEl.querySelector<HTMLElement>(`[data-index="${item.index}"]`);
        if (el) virt.measure(item.index, el.offsetHeight);
      }
    });
  },
});
```

---


### Pitfalls

- `measure(index, height)` must be called after the row's DOM is rendered and its height is stable. Calling it before render with an estimate triggers two layout passes per row.
- Call `measure()` in `onMounted`/`firstUpdated` or a `ResizeObserver` — not in a scroll event handler, where it causes a measurement/layout loop.
- If a row's height changes after initial measurement (e.g., a "show more" expansion), call `measure()` again. The virtualizer does not observe DOM height changes automatically.

### Related

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
