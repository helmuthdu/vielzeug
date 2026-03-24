---
title: 'Virtualit Examples — Variable Height with Measurement'
description: 'Variable Height with Measurement examples for virtualit.'
---

## Variable Height with Measurement

## Problem

Implement variable height with measurement in a production-friendly way with `@vielzeug/virtualit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/virtualit` installed.

Report exact heights after rendering using `measureElement()`. All measurement calls within a single tick are coalesced into one rebuild.

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
      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;padding:8px;`;
      el.textContent = messages[item.index].content;
      listEl.appendChild(el);
    }

    // Measure after layout — batched into one rebuild
    requestAnimationFrame(() => {
      for (const item of virtualItems) {
        const el = listEl.querySelector<HTMLElement>(`[data-index="${item.index}"]`);
        if (el) virt.measureElement(item.index, el.offsetHeight);
      }
    });
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
