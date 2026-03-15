---
title: Dragit — API Reference
description: Complete API reference for Dragit with type signatures, option documentation, and return value descriptions.
---

# Dragit API Reference

[[toc]]

## Types

### `DropZoneOptions`

```ts
interface DropZoneOptions {
  element: HTMLElement;
  accept?: string[];
  disabled?: () => boolean;
  dropEffect?: DataTransfer['dropEffect'];
  onDragEnter?: (event: DragEvent) => void;
  onDragLeave?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: (files: File[], event: DragEvent) => void;
  onDropRejected?: (files: File[], event: DragEvent) => void;
  onHoverChange?: (hovered: boolean) => void;
}
```

### `DropZone`

```ts
interface DropZone {
  readonly hovered: boolean;
  destroy(): void;
  [Symbol.dispose](): void;
}
```

### `SortableOptions`

```ts
interface SortableOptions {
  container: HTMLElement;
  handle?: string;
  disabled?: () => boolean;
  onDragStart?: (id: string, event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
  onReorder?: (orderedIds: string[]) => void;
}
```

### `Sortable`

```ts
interface Sortable {
  refresh(): void;
  destroy(): void;
  [Symbol.dispose](): void;
}
```

---

## `createDropZone()`

```ts
function createDropZone(options: DropZoneOptions): DropZone;
```

Attaches drag-and-drop file handling to a DOM element. Returns a `DropZone` handle.

| Option           | Type                                        | Default  | Description                                                                                                                                                |
| ---------------- | ------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `element`        | `HTMLElement`                               | —        | **Required.** The element to attach drag listeners to.                                                                                                     |
| `accept`         | `string[]`                                  | `[]`     | Accepted file types. Empty array accepts everything. Each entry is a MIME type (`'image/png'`), MIME wildcard (`'image/*'`), or file extension (`'.pdf'`). |
| `disabled`       | `() => boolean`                             | —        | When it returns `true`, all drag events are ignored and hover state does not change. Accepts a function for reactive framework integration.                |
| `dropEffect`     | `'copy' \| 'move' \| 'link' \| 'none'`      | `'copy'` | The `dropEffect` set on `dataTransfer` during `dragover`. Controls the cursor indicator.                                                                   |
| `onDragEnter`    | `(event: DragEvent) => void`                | —        | Called when a drag first enters the element. Counter-based — not called again on entry to a child.                                                         |
| `onDragLeave`    | `(event: DragEvent) => void`                | —        | Called when a drag fully leaves the element. Counter-based — not called when leaving a child.                                                              |
| `onDragOver`     | `(event: DragEvent) => void`                | —        | Called every `dragover` frame. Use to set a dynamic `dropEffect`.                                                                                          |
| `onDrop`         | `(files: File[], event: DragEvent) => void` | —        | Called with accepted files only. Not called if all dropped files are rejected.                                                                             |
| `onDropRejected` | `(files: File[], event: DragEvent) => void` | —        | Called with files that did not match `accept`. Not called if all files are accepted.                                                                       |
| `onHoverChange`  | `(hovered: boolean) => void`                | —        | Called when hover state toggles. Equivalent to combining `onDragEnter` and `onDragLeave` for simple styling.                                               |

**Returns:** `DropZone`

```ts
const zone = createDropZone({
  element: dropEl,
  accept: ['image/*', '.pdf'],
  onDrop: (files) => {
    upload(files);
  },
  onDropRejected: (files) => {
    showError(`${files.length} rejected`);
  },
  onHoverChange: (hovered) => {
    dropEl.classList.toggle('drag-over', hovered);
  },
});
```

---

## `DropZone` Interface

### `zone.hovered`

```ts
readonly hovered: boolean
```

`true` when a drag is currently over the zone. Updated synchronously by the internal counter — safe to read at any time.

```ts
console.log(zone.hovered); // false initially
```

### `zone.destroy()`

```ts
destroy(): void
```

Removes all event listeners from the element, resets the drag counter and hover state, and clears the `hovered` flag. Safe to call multiple times.

```ts
zone.destroy();
```

### `zone[Symbol.dispose]()`

```ts
[Symbol.dispose](): void
```

Alias for `destroy()`. Called automatically when used with the `using` keyword.

```ts
{
  using zone = createDropZone({ element: dropEl, onDrop: handleFiles });
} // zone.destroy() runs here
```

---

## `createSortable()`

```ts
function createSortable(options: SortableOptions): Sortable;
```

Makes the direct children of a container element reorderable via drag. Each item must have a `data-sort-id` attribute. Returns a `Sortable` handle.

`createSortable` sets `draggable="true"`, `role="listitem"` on all qualifying children and `role="list"` on the container at initialization. All are removed on `destroy()`.

| Option        | Type                                     | Default | Description                                                                                                                                   |
| ------------- | ---------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `container`   | `HTMLElement`                            | —       | **Required.** The container whose `[data-sort-id]` children become sortable.                                                                  |
| `handle`      | `string`                                 | —       | CSS selector for a drag handle inside each item. When omitted, the whole item is draggable.                                                   |
| `disabled`    | `() => boolean`                          | —       | When it returns `true`, `dragstart` is blocked. If a drag is in progress when disabled becomes `true`, `onReorder` will not fire at drag end. |
| `onDragStart` | `(id: string, event: DragEvent) => void` | —       | Called at the start of a drag. `id` is the `data-sort-id` of the item being dragged.                                                          |
| `onDragEnd`   | `(event: DragEvent) => void`             | —       | Called when a drag ends, whether completed or cancelled.                                                                                      |
| `onReorder`   | `(orderedIds: string[]) => void`         | —       | Called with the new order of `data-sort-id` values after a successful drop. Only fires when the order has actually changed.                   |

**Returns:** `Sortable`

```ts
const sortable = createSortable({
  container: listEl,
  handle: '.drag-handle',
  onDragStart: (id) => {
    listEl.classList.add('sorting');
  },
  onDragEnd: () => {
    listEl.classList.remove('sorting');
  },
  onReorder: (ids) => {
    saveOrder(ids);
  },
});
```

---

## `Sortable` Interface

### `sortable.refresh()`

```ts
refresh(): void
```

Re-scans the container's children and sets `draggable="true"` and `role="listitem"` on all elements with a `data-sort-id` attribute. Call this after programmatically adding or removing items.

```ts
// After adding a new item to the DOM:
const item = document.createElement('li');
item.dataset.sortId = 'new-item';
item.textContent = 'New Task';
listEl.appendChild(item);

sortable.refresh();
```

### `sortable.destroy()`

```ts
destroy(): void
```

Removes all event listeners from the container, strips `draggable` and `role` attributes from all items, and cleans up any in-progress drag state (removes `data-dragging` attribute, removes the placeholder element).

### `sortable[Symbol.dispose]()`

```ts
[Symbol.dispose](): void
```

Alias for `destroy()`.

---

## DOM Attributes

Dragit reads and writes the following DOM attributes:

| Attribute            | Set by                              | Removed by              | Description                                                                                       |
| -------------------- | ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| `data-sort-id`       | You                                 | —                       | Required on each sortable item. Used as the stable identifier in `onReorder`.                     |
| `draggable`          | `createSortable` init / `refresh()` | `destroy()`             | Enables native drag on each item.                                                                 |
| `role="list"`        | `createSortable` init               | `destroy()`             | Accessibility role on the container.                                                              |
| `role="listitem"`    | `createSortable` init / `refresh()` | `destroy()`             | Accessibility role on each item.                                                                  |
| `data-dragging`      | During drag                         | `dragend` / `destroy()` | Applied to the item currently being dragged. Use for styling: `[data-dragging] { opacity: 0.4 }`. |
| `aria-hidden="true"` | On placeholder creation             | Placeholder removal     | Applied to the `.dragit-placeholder` element.                                                     |

## CSS Classes

| Class                | Applied to                   | When                                                          |
| -------------------- | ---------------------------- | ------------------------------------------------------------- |
| `dragit-placeholder` | `<div>` inserted by sortable | While an item is being dragged, in the placeholder's position |
