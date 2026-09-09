---
title: 'Scroll Examples — Reactive Virtualizer'
description: 'Bridge Scroll external-store state into a @vielzeug/ripple reactive graph.'
---

## Reactive Virtualizer

### Problem

You use `@vielzeug/ripple` or `@vielzeug/ore` and want virtualizer state to participate in the reactive graph without coupling Scroll to a reactive runtime.

### Solution

Pass the virtualizer directly to Ripple's `fromSubscribable()`. Every Scroll controller implements the framework-neutral `getSnapshot()` and `subscribe()` contract.

```ts
import { effect, fromSubscribable } from '@vielzeug/ripple';
import { createVirtualizer } from '@vielzeug/scroll';

const rows = Array.from({ length: 50_000 }, (_, i) => ({ id: i, label: `Row ${i}` }));
const scrollEl = document.querySelector<HTMLElement>('#scroll')!;
const listEl = document.querySelector<HTMLElement>('#list')!;

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 36,
});
const state = fromSubscribable(virt, { signal: virt.disposalSignal });
const renderEffect = effect(() => {
  const { items, totalSize } = state.value;

  listEl.style.height = `${totalSize}px`;
  listEl.replaceChildren();

  for (const item of items) {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:36px;line-height:36px;padding:0 12px;`;
    el.textContent = rows[item.index]!.label;
    listEl.appendChild(el);
  }
});

virt.scrollToIndex(rows.length - 1, { align: 'end', behavior: 'smooth' });

renderEffect.dispose();
virt.dispose();
```

Read state without a reactive bridge through `getSnapshot()`:

```ts
const { items, totalSize } = virt.getSnapshot();
console.log(`${items.length} items visible, total ${totalSize}px`);
```

### Pitfalls

- Install `@vielzeug/ripple` in your application when using `fromSubscribable()`; Scroll does not install it.
- Pass `virt.disposalSignal` to dispose the bridge with the virtualizer.
- Dispose effects created by your application before disposing the virtualizer.
- Avoid heavy synchronous work in reactive effects triggered during scrolling.

### Related

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Grid Virtualizer](./grid-virtualizer.md)
- [Grouped List (Headers + Rows)](./grouped-list-headers-plus-rows.md)
