---
title: 'Dnd Examples — Combined: sortable with inline editing'
description: 'Combined sortable with inline editing example for @vielzeug/dnd.'
---

## Combined: sortable with inline editing

### Problem

Your list items need to be both reorderable by drag and editable inline by click. The two interaction modes conflict: a click that starts an edit must not be interpreted as the beginning of a drag.

### Solution

A list where items can be reordered by drag and inline-edited:

```ts
import { createSortable } from '@vielzeug/dnd';

let items = [
  { id: '1', label: 'Design' },
  { id: '2', label: 'Develop' },
  { id: '3', label: 'Deploy' },
];

function render() {
  listEl.innerHTML = items
    .map(
      (item) => `
        <li data-sort-id="${item.id}">
          <span class="handle">⠿</span>
          <input value="${item.label}" data-item-id="${item.id}" />
        </li>
      `,
    )
    .join('');

  sortable.sync();
}

const sortable = createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  handle: '.handle',
  onReorder: ({ ids }) => {
    items = ids.map((id) => items.find((i) => i.id === id)!);
    saveItems(items);
  },
});

render();
```

### Pitfalls

- A `pointerdown` event starts a drag by default. Guard inline-edit activation behind an explicit handle element or a long-press delay so a short click doesn't trigger a drag.
- Avoid calling `sortable.sync()` while a drag is in progress. Re-render after `onDragEnd` if your UI rebuilds the list.
- Ensure the edit button calls `e.stopPropagation()` so a click on the button does not propagate to the item's drag listener.

### Related

- [File upload drop zone](./file-upload-drop-zone.md)
- [Framework Integration](../usage.md#framework-integration)
- [Sortable list](./sortable-list.md)
