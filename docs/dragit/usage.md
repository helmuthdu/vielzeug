---
title: Dragit — Usage Guide
description: Drop zones, sortable lists, connected groups, keyboard sorting, and cleanup patterns with Dragit.
---

::: tip New to Dragit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Drop Zone

`createDropZone` attaches drag-and-drop behavior to any DOM element and keeps hover state stable with a counter.

### Basic usage

```ts
const zone = createDropZone({
  element: document.getElementById('dropzone')!,
  onDrop: (files) => {
    uploadFiles(files);
  },
});
```

### Accept filtering

```ts
const zone = createDropZone({
  element: dropEl,
  accept: ['image/*', '.pdf', 'application/json'],
  onDrop: (files) => {
    // accepted files only
  },
  onDropRejected: (files) => {
    showToast(`${files.length} file(s) not accepted`);
  },
});
```

For reactive apps, `accept` can be a getter:

```ts
const zone = createDropZone({
  element: dropEl,
  accept: () => (isMediaMode.value ? ['image/*', 'video/*'] : ['application/pdf']),
});
```

### Hover state

```ts
const zone = createDropZone({
  element: dropEl,
  onHoverChange: (hovered) => {
    dropEl.classList.toggle('drag-over', hovered);
  },
});
```

Read zone state imperatively:

```ts
console.log(zone.hovered);
console.log(zone.files);
console.log(zone.rejected);
```

### Drop effect

```ts
createDropZone({
  element: dropEl,
  dropEffect: 'move',
  onDrop: (files) => {
    // ...
  },
});
```

### Disabled state

```ts
createDropZone({
  element: dropEl,
  disabled: () => isReadOnly.value,
  onDrop: handleFiles,
});
```

### Cleanup

```ts
zone.destroy();
// or:
using zone = createDropZone({ element: dropEl, onDrop: handleFiles });
```

---

## Sortable

`createSortable` makes direct children of a container reorderable via drag.

### Setup

```html
<ul id="task-list">
  <li data-sort-id="task-1">Design</li>
  <li data-sort-id="task-2">Develop</li>
  <li data-sort-id="task-3">Review</li>
</ul>
```

```ts
const sortable = createSortable({
  element: document.getElementById('task-list')!,
  axis: 'vertical',
  onReorder: (ids) => {
    saveTaskOrder(ids);
  },
});
```

Dragit automatically sets:

- `draggable="true"` on sortable nodes (or handles)
- `role="listitem"` on each item
- `role="list"` on the container
- `tabindex="0"` on each item for keyboard reordering

### Drag handles

```ts
createSortable({
  element: listEl,
  handle: '.drag-handle',
  onReorder: saveOrder,
});
```

### Keyboard reordering

Focus an item and use arrow keys to move it. `Home` and `End` move to boundaries.

### Connected lists

Use the same `group` value to move items between containers:

```ts
createSortable({ element: todoEl, group: 'board', onReorder: saveTodoOrder });
createSortable({ element: doneEl, group: 'board', onReorder: saveDoneOrder });
```

### Auto-scroll and drag preview

```ts
createSortable({
  element: listEl,
  autoScroll: { edgeThreshold: 40, speed: 24 },
  dragImage: (id, item) => item,
});
```

### Lifecycle hooks

```ts
createSortable({
  element: listEl,
  onDragStart: (id) => {
    listEl.classList.add('sorting');
  },
  onDragEnd: (id) => {
    listEl.classList.remove('sorting');
  },
  onReorder: saveOrder,
});
```

### Custom identity attribute

```ts
createSortable({
  element: listEl,
  itemAttribute: 'data-id',
  onReorder: saveOrder,
});
```

### Dynamic lists

The `MutationObserver` keeps sortable attributes in sync automatically.

```ts
const item = document.createElement('li');
item.dataset.sortId = 'task-4';
item.textContent = 'Deploy';
listEl.appendChild(item);
```

### Disabled state

```ts
createSortable({
  element: listEl,
  disabled: () => isLocked,
  onReorder: saveOrder,
});
```

### Placeholder styling

```css
.dragit-placeholder {
  background: var(--color-primary-50);
  border: 2px dashed var(--color-primary-300);
  border-radius: 4px;
  box-sizing: border-box;
}

[data-dragging] {
  opacity: 0.35;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

### Mapping DOM order back to data

```ts
import { applyReorder, createSortable } from '@vielzeug/dragit';

let items = [
  { id: 'task-1', title: 'Design' },
  { id: 'task-2', title: 'Develop' },
  { id: 'task-3', title: 'Review' },
];

createSortable({
  element: listEl,
  onReorder: (orderedIds) => {
    items = applyReorder(items, orderedIds, (item) => item.id);
  },
});
```

### Cleanup

```ts
sortable.destroy();
// or:
using sortable = createSortable({ element: listEl, onReorder: saveOrder });
```
