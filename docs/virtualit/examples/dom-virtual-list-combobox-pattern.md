---
title: 'Virtualit Examples — DOM Virtual List Combobox Pattern'
description: 'Use @vielzeug/virtualit/dom to virtualize a combobox/listbox popup with a small controller API.'
---

## DOM Virtual List Combobox Pattern

## Problem

Virtualize a popup listbox (combobox/dropdown style) without hand-wiring `Virtualizer` attach, count updates, and teardown every time the popup opens or closes.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/virtualit` installed.

Use `createDomVirtualList` so your component only needs to call `setItems(items)` and `setActive(isOpen)` with a DOM render callback.

```ts
import { createDomVirtualList, type DomVirtualListController } from '@vielzeug/virtualit/dom';

type Option = { disabled?: boolean; label: string; value: string };

const options: Option[] = Array.from({ length: 2_000 }, (_, i) => ({
  label: `Option ${i}`,
  value: `opt-${i}`,
}));

let isOpen = false;
let focusedIndex = 0;
let controller: DomVirtualListController<Option> | null = null;

function ensureController() {
  if (controller) return controller;

  controller = createDomVirtualList<Option>({
    estimateSize: 36,
    getListElement: () => document.querySelector<HTMLElement>('[role="listbox"]'),
    getScrollElement: () => document.querySelector<HTMLElement>('.dropdown'),
    overscan: 4,
    render: ({ items, listEl, virtualItems }) => {
      for (const item of virtualItems) {
        const opt = items[item.index];
        if (!opt) continue;

        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'option';
        row.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.top}px);`;
        row.textContent = opt.label;
        row.disabled = !!opt.disabled;
        row.addEventListener('click', () => {
          console.log('selected', opt.value);
        });
        listEl.appendChild(row);
      }
    },
  });

  return controller;
}

function openDropdown() {
  isOpen = true;
  ensureController().setItems(options);
  ensureController().setActive(isOpen);
}

function closeDropdown() {
  isOpen = false;
  ensureController().setActive(isOpen); // disables virtualization + resets list styles
}

function onArrowDown() {
  focusedIndex = Math.min(focusedIndex + 1, options.length - 1);
  ensureController().scrollToIndex(focusedIndex, { align: 'auto' });
}

function destroyCombobox() {
  controller?.destroy();
  controller = null;
}
```

---

## Expected Output

- Opening the dropdown only renders the visible option window plus overscan.
- Keyboard focus movement can keep the focused option visible with `scrollToIndex(..., { align: 'auto' })`.
- Closing and destroying cleanly tear down the virtualizer.

## Common Pitfalls

- Returning `null` from `getScrollElement`/`getListElement` while open prevents activation.
- Forgetting `setItems(items)` or `setActive(isOpen)` on open/close leaves stale DOM state.
- Mixing non-virtual state rows with `.option` rows without a clear strategy can make `clear` remove the wrong nodes.

## Related Recipes

- [Keyboard Navigation](./keyboard-navigation.md)
- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Using `Virtualizer` Directly (Without `createVirtualizer`)](./using-virtualizer-directly-without-createvirtualizer.md)
