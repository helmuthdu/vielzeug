---
title: 'Dragit Examples — Sortable list'
description: 'Sortable list examples for dragit.'
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

.dragit-placeholder {
  background: var(--color-primary-50);
  border: 2px dashed var(--color-primary-300);
  border-radius: 4px;
  box-sizing: border-box;
}
```

```ts
import { createSortable } from '@vielzeug/dragit';

using sortable = createSortable({
  element: document.getElementById('list')!,
  handle: '.handle',
  onReorder: (ids) => {
    console.log('New order:', ids); // ['b', 'a', 'c']
    saveOrder(ids);
  },
});
```


### Pitfalls

- If the list container has `touch-action: auto`, touch drags on mobile scroll the page instead of dragging. Set `touch-action: none` on drag handles.
- Mutating the array directly (e.g., `splice`) without reading `sortend`'s `from` and `to` indices produces an out-of-sync UI. Always use the indices from the event payload.
- Setting `animation: 0` disables the drop placeholder animation, making the insertion point visually ambiguous. Use a small non-zero value for clarity.

### Related

- [Connected kanban with keyboard sorting](./connected-kanban-keyboard-sorting.md)
- [Combined: sortable with inline editing](./combined-sortable-with-inline-editing.md)
- [File upload drop zone](./file-upload-drop-zone.md)
- [Framework Integration](../usage.md#framework-integration)
