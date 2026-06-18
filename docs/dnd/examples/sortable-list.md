---
title: 'Dnd Examples — Sortable list'
description: 'Sortable list example for @vielzeug/dnd.'
---

## Sortable list

### Problem

You need a reorderable list where users drag items by an explicit handle. This is the baseline sortable pattern — a starting point before adding keyboard support or persistence.

### Solution

A basic reorderable list with a visible drag handle and placeholder styling:

```html
<ul id="list">
  <li data-sort-id="a"><span class="handle">⠿</span> Item A</li>
  <li data-sort-id="b"><span class="handle">⠿</span> Item B</li>
  <li data-sort-id="c"><span class="handle">⠿</span> Item C</li>
</ul>
```

```css
.handle {
  cursor: grab;
  user-select: none;
  margin-right: 0.5rem;
  color: var(--color-contrast-400);
}

[data-dragging] {
  /* opacity is managed automatically — use for other effects */
}

.dnd-placeholder {
  background: var(--color-primary-50);
  border: 2px dashed var(--color-primary-300);
  border-radius: 4px;
  box-sizing: border-box;
}
```

```ts
import { createSortable } from '@vielzeug/dnd';

using sortable = createSortable({
  element: document.getElementById('list')!,
  getKey: (el) => el.dataset.sortId!,
  handle: '.handle',
  onReorder: ({ ids }) => {
    console.log('New order:', ids); // ['b', 'a', 'c']
    saveOrder(ids);
  },
});
```

### Pitfalls

- If the list container has `touch-action: auto`, touch drags on mobile scroll the page instead of dragging. Set `touch-action: none` on drag handles.
- Do not call `sortable.sync()` while a drag is in progress. If your list re-renders, wait for `onDragEnd` before mutating the DOM and syncing.
- `onReorder` fires only when the order actually changes. Do not assume it fires on every drop.

### Related

- [Connected kanban with keyboard sorting](./connected-kanban-keyboard-sorting.md)
- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [File upload drop zone](./file-upload-drop-zone.md)
- [Framework Integration](../usage.md#framework-integration)
