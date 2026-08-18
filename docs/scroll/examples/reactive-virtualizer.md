---
title: 'Scroll Examples — Reactive Virtualizer'
description: 'Use createVirtualizer with the signal option to integrate scroll state with @vielzeug/ripple signals.'
---

## Reactive Virtualizer

### Problem

You are building a component with `@vielzeug/ripple` or `@vielzeug/ore` and want scroll state to flow through the reactive graph — no manual `onChange` wiring.

### Solution

Pass a `signal` factory to `createVirtualizer`. The virtualizer calls it with the initial state and then updates the returned `Signal<VirtualizerState>` on every visible-window change. Use `effect` to re-render whenever the signal updates.

```ts
import { signal, effect } from '@vielzeug/ripple';
import { createVirtualizer } from '@vielzeug/scroll';

const rows = Array.from({ length: 50_000 }, (_, i) => ({ id: i, label: `Row ${i}` }));

const scrollEl = document.getElementById('scroll')!;
const listEl = document.getElementById('list')!;

const state = signal({ items: [], stickyItems: [], totalSize: 0 });

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 36,
  signal: (init) => state,
});

// Re-render whenever the visible window changes
effect(() => {
  const { items, totalSize } = state.value;

  listEl.style.height = `${totalSize}px`;
  listEl.replaceChildren();

  for (const item of items) {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:36px;line-height:36px;padding:0 12px;`;
    el.textContent = rows[item.index].label;
    listEl.appendChild(el);
  }
});

// Standard virtualizer methods are available directly
virt.scrollToIndex(rows.length - 1, { align: 'end', behavior: 'smooth' });
virt.update({ count: rows.length });

// Cleanup
virt.dispose();
```

### Reading state outside an effect

`state` is a standard `Signal<VirtualizerState>`. Read `.value` anywhere:

```ts
const { items, totalSize } = state.value;
console.log(`${items.length} items visible, total ${totalSize}px`);
```

### Combining with a computed signal

```ts
import { computed } from '@vielzeug/ripple';

const visibleCount = computed(() => state.value.items.length);

effect(() => {
  statusEl.textContent = `Showing ${visibleCount.value} of ${virt.count} rows`;
});
```

---

### Pitfalls

- The `signal` factory is called once on construction with the initial state. The virtualizer then updates the signal's `.value` on every scroll cycle — do not replace the signal object after construction.
- The signal updates synchronously within the scroll handler. Avoid heavy DOM operations directly inside `effect` — batch DOM writes with `requestAnimationFrame` if needed.
- All live getters (`count`, `items`, `totalSize`, `scrollOffset`, `stickyItems`) remain current on the returned virtualizer through copied property descriptors rather than snapshotting.

### Related

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Grid Virtualizer](./grid-virtualizer.md)
- [Grouped List (Headers + Rows)](./grouped-list-headers-plus-rows.md)
