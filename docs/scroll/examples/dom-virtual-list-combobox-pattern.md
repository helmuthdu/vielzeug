---
title: 'Scroll Examples — DOM Virtual List Combobox Pattern'
description: 'Use @vielzeug/scroll/dom to virtualize a combobox/listbox popup with a small controller API.'
---

## DOM Virtual List Combobox Pattern

### Problem

Virtualize a popup listbox (combobox/dropdown style) without hand-wiring `Virtualizer` attach, count updates, and teardown every time the popup opens or closes.

### Solution

Use `createDomVirtualList` so your component only needs to call `setItems(items)` and `setActive(isOpen)` with a DOM render callback.

```ts
import { createDomVirtualList, type DomVirtualListController } from '@vielzeug/scroll/dom';

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
    listElement: document.querySelector<HTMLElement>('[role="listbox"]')!,
    overscan: { start: 4, end: 4 },
    render: ({ items, listEl, virtualItems }) => {
      listEl.replaceChildren();

      for (const item of virtualItems) {
        const opt = items[item.index];
        if (!opt) continue;

        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'option';
        row.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.start}px);`;
        row.textContent = opt.label;
        row.disabled = !!opt.disabled;
        row.addEventListener('click', () => {
          console.log('selected', opt.value);
        });
        listEl.appendChild(row);
      }
    },
    scrollElement: document.querySelector<HTMLElement>('.dropdown')!,
  });

  return controller;
}

function openDropdown() {
  isOpen = true;
  ensureController().setActive(isOpen);
  ensureController().setItems(options);
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

### Pitfalls

- Calling `setActive(true)` before `setItems()` on an empty list is a no-op — the virtualizer only spawns when there are items. Always call `setItems` before opening the dropdown.
- Holding a stale `controller` reference after `destroyCombobox()` and then calling `setItems()` or `setTarget()` on it is a no-op because the controller guards against post-destroy calls. Re-create the controller instead.
- Lazy-initializing the controller inside `ensureController()` every time the dropdown opens means the reference held by click handlers can become stale if `destroy()` is called mid-session. Use a module-level variable and check for `null` before each call.

### Related

- [Dropdown Select (Orbit)](@vielzeug/orbit/examples/dropdown-select)
- [Keyboard Navigation](./keyboard-navigation.md)
- [Basic Fixed-Height List](./basic-fixed-height-list.md)
