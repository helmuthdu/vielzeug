---
title: Dragit — Usage Guide
description: Drop zones, sortable lists, accept patterns, MIME filtering, handles, dynamic lists, disabled state, and lifecycle management with Dragit.
---

# Dragit Usage Guide

::: tip New to Dragit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Why Dragit?

The HTML5 Drag & Drop API requires careful counter tracking to avoid hover state flicker, has no MIME type pre-filtering, and provides no sortable list abstraction.

```ts
// Before — raw HTML5 Drag & Drop
let enterCount = 0;
dropzone.addEventListener('dragenter', () => { enterCount++; dropzone.classList.add('over'); });
dropzone.addEventListener('dragleave', () => { if (--enterCount === 0) dropzone.classList.remove('over'); });
dropzone.addEventListener('dragover', (e) => e.preventDefault());
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  enterCount = 0;
  const files = [...e.dataTransfer!.files];
  if (!files.every((f) => f.type.startsWith('image/'))) return showError('Images only');
  uploadFiles(files);
});

// After — Dragit
import { createDropZone } from '@vielzeug/dragit';
const zone = createDropZone({
  element: dropzone,
  accept: ['image/*'],
  onDrop: (files) => uploadFiles(files),
  onDropRejected: (files) => showError(`${files.length} file(s) not accepted`),
  onHoverChange: (hovered) => dropzone.classList.toggle('over', hovered),
});
```

| Feature             | Dragit                                       | SortableJS | dnd-kit    |
| ------------------- | -------------------------------------------- | ---------- | ---------- |
| Bundle size         | <PackageInfo package="dragit" type="size" /> | ~12 kB     | ~25 kB     |
| Framework agnostic  | ✅                                           | ✅         | React only |
| MIME type filtering | ✅ Pre-validated                             | ❌         | ❌         |
| Counter-based hover | ✅                                           | ❌         | N/A        |
| Sortable lists      | ✅                                           | ✅         | ✅         |
| Drag handles        | ✅                                           | ✅         | ✅         |
| `using` support     | ✅                                           | ❌         | ❌         |
| Zero dependencies   | ✅                                           | ✅         | ❌         |

**Use Dragit when** you need reliable file drop zones with MIME filtering or sortable lists in a framework-agnostic environment.

**Consider dnd-kit** if you are building a React app and need complex multi-container drag interactions or accessibility-first sortable trees.

## Import

```ts
import { createDropZone, createSortable } from '@vielzeug/dragit';

// Types only
import type { DropZone, DropZoneOptions, Sortable, SortableOptions } from '@vielzeug/dragit';
```

## Drop Zone

`createDropZone` attaches drag-and-drop behaviour to any DOM element. It handles the quirks of the HTML Drag & Drop API — most importantly, hover state is tracked with a counter so it never fires spuriously when the cursor moves over a child element.

### Basic usage

```ts
const zone = createDropZone({
  element: document.getElementById('dropzone')!,
  onDrop: (files, event) => {
    // files is always a non-empty File[]
    uploadFiles(files);
  },
});
```

### Accept filtering

Pass an `accept` array to restrict which files are accepted. Patterns follow the format used by `<input type="file" accept="...">`:

| Pattern       | Matches                           |
| ------------- | --------------------------------- |
| `'image/png'` | Exact MIME type                   |
| `'image/*'`   | Any image MIME type               |
| `'.pdf'`      | File extension (case-insensitive) |

```ts
const zone = createDropZone({
  element: dropEl,
  accept: ['image/*', '.pdf', 'application/json'],
  onDrop: (files) => {
    // Only accepted files arrive here
  },
  onDropRejected: (files) => {
    showToast(`${files.length} file(s) not accepted`);
  },
});
```

Files are pre-validated during drag via `dataTransfer.items` (MIME types and wildcards) — the cursor shows a `none` drop effect before the user even releases. Extension patterns (`.pdf`) can only be confirmed at drop time since `DataTransferItem` does not expose filenames, so they receive optimistic hover treatment.

### Hover state

`onHoverChange` is the simplest way to react to drag-over state. It receives `true` when the drag enters the zone and `false` when it leaves or completes.

```ts
const zone = createDropZone({
  element: dropEl,
  onHoverChange: (hovered) => {
    dropEl.classList.toggle('drag-over', hovered);
  },
});
```

For more control, use `onDragEnter` and `onDragLeave` directly:

```ts
const zone = createDropZone({
  element: dropEl,
  onDragEnter: (event) => {
    /* drag has entered */
  },
  onDragLeave: (event) => {
    /* drag has left */
  },
  onDragOver: (event) => {
    /* fires every frame while hovering */
  },
});
```

Reading the current state imperatively:

```ts
console.log(zone.hovered); // boolean — true while dragging over
```

### dropEffect

Control the cursor feedback shown to the user while dragging over the zone. Defaults to `'copy'`.

```ts
const zone = createDropZone({
  element: dropEl,
  dropEffect: 'move', // 'copy' | 'move' | 'link' | 'none'
  onDrop: (files) => {
    /* ... */
  },
});
```

::: tip
`onDragOver` can override `dropEffect` dynamically per-frame if you need conditional feedback (e.g. `'move'` when Alt is held, `'copy'` otherwise).
:::

### Disabled state

Pass a function to `disabled`. When it returns `true`, all drag events are silently ignored and hover state will not change.

```ts
const zone = createDropZone({
  element: dropEl,
  disabled: () => props.readOnly,
  onDrop: (files) => {
    /* ... */
  },
});
```

The function form lets reactive frameworks pass a derived or computed value:

```ts
// Vue 3 / signals-based frameworks
disabled: () => isReadOnly.value;
```

### Cleanup

Call `destroy()` to remove all event listeners and reset internal state:

```ts
zone.destroy();
```

Or use the `using` keyword (TypeScript 5.2+, requires `"lib": ["ESNext.Disposable"]`):

```ts
{
  using zone = createDropZone({ element: dropEl, onDrop: handleFiles });
  // zone is active here
} // zone.destroy() is called automatically at block exit
```

---

## Sortable

`createSortable` makes the direct children of a container element reorderable via drag. It uses event delegation — a single set of listeners on the container handles all children.

### Setup

Every sortable item must carry a `data-sort-id` attribute with a unique, stable identifier:

```html
<ul id="task-list">
  <li data-sort-id="task-1">Design</li>
  <li data-sort-id="task-2">Develop</li>
  <li data-sort-id="task-3">Review</li>
</ul>
```

```ts
const sortable = createSortable({
  container: document.getElementById('task-list')!,
  onReorder: (ids) => {
    // ids is the new ordered array of data-sort-id values
    // Only called when the order actually changed
    saveTaskOrder(ids); // e.g. ['task-2', 'task-1', 'task-3']
  },
});
```

`createSortable` automatically:

- Sets `draggable="true"` on all `[data-sort-id]` children
- Sets `role="listitem"` on each item and `role="list"` on the container
- Removes both attributes on `destroy()`

### Drag handles

By default the entire item is draggable. Pass a `handle` selector to restrict dragging to a specific child element:

```html
<ul id="task-list">
  <li data-sort-id="task-1">
    <span class="drag-handle">⠿</span>
    Design
  </li>
  <li data-sort-id="task-2">
    <span class="drag-handle">⠿</span>
    Develop
  </li>
</ul>
```

```ts
const sortable = createSortable({
  container: listEl,
  handle: '.drag-handle',
  onReorder: (ids) => {
    saveOrder(ids);
  },
});
```

### Lifecycle hooks

```ts
const sortable = createSortable({
  container: listEl,
  onDragStart: (id, event) => {
    // id — the data-sort-id of the item being dragged
    listEl.classList.add('sorting');
  },
  onDragEnd: (event) => {
    listEl.classList.remove('sorting');
  },
  onReorder: (ids) => {
    saveOrder(ids);
  },
});
```

### Dynamic lists

When items are added to or removed from the container after `createSortable` is called, call `refresh()` to re-scan and update `draggable`/`role` on the current children:

```ts
// Add a new item to the DOM
const newItem = document.createElement('li');
newItem.dataset.sortId = 'task-4';
newItem.textContent = 'Deploy';
listEl.appendChild(newItem);

// Sync dragit state
sortable.refresh();
```

### Disabled state

```ts
const sortable = createSortable({
  container: listEl,
  disabled: () => isLocked,
  onReorder: (ids) => {
    saveOrder(ids);
  },
});
```

When disabled, `dragstart` is blocked. If the sortable becomes disabled while a drag is in progress, `onReorder` will not fire at drag end.

### Styling the placeholder

While an item is being dragged, dragit inserts a `<div class="dragit-placeholder">` in the list to indicate the drop position. Only `height` is set inline (mirroring the dragged item). All visual styling is left to your CSS:

```css
.dragit-placeholder {
  background: var(--color-primary-50);
  border: 2px dashed var(--color-primary-300);
  border-radius: 4px;
  box-sizing: border-box;
  transition: opacity 150ms;
}
```

The item being dragged receives a `data-dragging` attribute while in flight, which you can also style:

```css
[data-dragging] {
  opacity: 0.4;
}
```

### Cleanup

```ts
sortable.destroy();
// or:
using sortable = createSortable({ container: listEl, onReorder: saveOrder });
```

`destroy()` removes all event listeners, strips `draggable`/`role` from all items, and cleans up any in-progress drag state (removes `data-dragging` attribute, removes the placeholder).
