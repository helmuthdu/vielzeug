---
title: 'Scroll Examples — DOM Virtual List Combobox Pattern'
description: 'Use createDomVirtualList to virtualize a combobox/listbox popup with a small controller API.'
---

## DOM Virtual List Combobox Pattern

### Problem

Virtualize a popup listbox (combobox/dropdown style) without hand-wiring `Virtualizer` attach, count updates, and teardown every time the popup opens or closes.

### Solution

Use `createDomVirtualList` so your component only needs to call `setItems(options)` to open and `setItems([])` to close. The virtualizer is created lazily on the first non-empty `setItems()` call and destroyed automatically when `setItems([])` is called.

```ts
import { createDomVirtualList, type DomVirtualListController } from '@vielzeug/scroll';

type Option = { disabled?: boolean; label: string; value: string };

const options: Option[] = Array.from({ length: 2_000 }, (_, i) => ({
  label: `Option ${i}`,
  value: `opt-${i}`,
}));

let focusedIndex = 0;
let controller: DomVirtualListController<Option> | null = null;

function ensureController() {
  if (controller) return controller;

  controller = createDomVirtualList<Option>({
    estimateSize: 36,
    getItemKey: (_, opt) => opt.value,
    listElement: document.querySelector<HTMLElement>('[role="listbox"]')!,
    overscan: { end: 4, start: 4 },
    render: ({ items, listEl, recycle }) => {
      for (const item of items) {
        const row = recycle(item.data.value, () => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'option';
          btn.addEventListener('click', () => console.log('selected', btn.dataset.value));
          return btn;
        });
        row.dataset.value = item.data.value;
        row.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.start}px);height:${item.size}px;`;
        row.textContent = item.data.label;
        row.disabled = !!item.data.disabled;
        listEl.appendChild(row);
      }
    },
    scrollElement: document.querySelector<HTMLElement>('.dropdown')!,
  });

  return controller;
}

function openDropdown() {
  focusedIndex = 0;
  ensureController().setItems(options); // spawns virtualizer, renders first window
}

function closeDropdown() {
  ensureController().setItems([]); // destroys virtualizer, clears list styles
}

function onArrowDown() {
  focusedIndex = Math.min(focusedIndex + 1, options.length - 1);
  ensureController().scrollToIndex(focusedIndex, { align: 'auto' });
}

function onArrowUp() {
  focusedIndex = Math.max(focusedIndex - 1, 0);
  ensureController().scrollToIndex(focusedIndex, { align: 'auto' });
}

function destroyCombobox() {
  controller?.dispose();
  controller = null;
}
```

---

### Pitfalls

- Calling `setItems([])` destroys the virtualizer and clears the `listElement` height style. Re-opening calls `setItems(options)` which spawns a fresh virtualizer.
- Holding a stale `controller` reference after `destroyCombobox()` — all method calls are safe no-ops. Re-create the controller on next open instead.
- When `getItemKey` is omitted, `setItems()` drops all cached measurements. Pass `getItemKey: (_, opt) => opt.value` to preserve measurements across open/close cycles.

### Related

- [Dropdown Select (Orbit)](@vielzeug/orbit/examples/dropdown-select)
- [Keyboard Navigation](./keyboard-navigation.md)
- [Basic Fixed-Height List](./basic-fixed-height-list.md)
