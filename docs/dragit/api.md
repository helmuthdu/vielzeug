---
title: Dragit — API Reference
description: Complete API reference for Dragit with type signatures, option documentation, and return value descriptions.
---

# Dragit API Reference

[[toc]]

## API At a Glance

| Symbol                   | Purpose                                      | Execution mode | Common gotcha                                                     |
| ------------------------ | -------------------------------------------- | -------------- | ----------------------------------------------------------------- |
| `createDropZone()`       | Create a typed drop-zone controller          | Sync           | Remember to destroy the controller during teardown                |
| `createSortable()`       | Add sortable drag-and-drop behavior to lists | Sync           | Provide stable item identity for reorder operations               |
| `DropZoneOptions.accept` | Filter file types before processing          | Sync           | Mismatch between MIME and extension can reject files unexpectedly |

## Types

### `DropZoneOptions`

```ts
interface DropZoneOptions {
  element: HTMLElement;
  accept?: string[];
  disabled?: boolean | (() => boolean);
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
  element: HTMLElement;
  handle?: string;
  itemAttribute?: string;
  disabled?: boolean | (() => boolean);
  onDragStart?: (id: string, event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
  onReorder?: (orderedIds: string[]) => void;
}
```

### `Sortable`

```ts
interface Sortable {
  destroy(): void;
  [Symbol.dispose](): void;
}
```

---

## `createDropZone()`

```ts
declare function createDropZone(options: DropZoneOptions): DropZone;
```

Attaches drag-and-drop file handling to a DOM element. Returns a `DropZone` handle.

| Option           | Type                                        | Default  | Description                                                                                                                                                |
| ---------------- | ------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `element`        | `HTMLElement`                               | —        | **Required.** The element to attach drag listeners to.                                                                                                     |
| `accept`         | `string[]`                                  | `[]`     | Accepted file types. Empty array accepts everything. Each entry is a MIME type (`'image/png'`), MIME wildcard (`'image/*'`), or file extension (`'.pdf'`). |
| `disabled`       | `boolean \| (() => boolean)`                | —        | When truthy, all drag events are ignored and hover state does not change. Accepts a boolean or a function for reactive framework integration.              |
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

`readonly hovered: boolean`

`true` when a drag is currently over the zone. Updated synchronously by the internal counter — safe to read at any time.

```ts
console.log(zone.hovered); // false initially
```

### `zone.destroy()`

`destroy(): void`

Removes all event listeners from the element, resets the drag counter and hover state, and clears the `hovered` flag. Safe to call multiple times.

```ts
zone.destroy();
```

### `zone[Symbol.dispose]()`

`[Symbol.dispose](): void`

Alias for `destroy()`. Called automatically when used with the `using` keyword.

```ts
{
  using zone = createDropZone({ element: dropEl, onDrop: handleFiles });
} // zone.destroy() runs here
```

---

## `createSortable()`

```ts
declare function createSortable(options: SortableOptions): Sortable;
```

Makes the direct children of a container element reorderable via drag. Each item must have the identity attribute (`data-sort-id` by default). Returns a `Sortable` handle.

`createSortable` sets `draggable="true"` and `role="listitem"` on qualifying children and sets `role="list"` on the container at initialization. A `MutationObserver` keeps these attributes in sync when children are added or removed — no manual `refresh()` call required.

| Option          | Type                                     | Default          | Description                                                                                                                                       |
| --------------- | ---------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `element`       | `HTMLElement`                            | —                | **Required.** The container whose identity-attribute children become sortable.                                                                    |
| `handle`        | `string`                                 | —                | CSS selector for a drag handle inside each item. When omitted, the whole item is draggable. `draggable` is set on the handle element, not the item. |
| `itemAttribute` | `string`                                 | `'data-sort-id'` | The attribute used to read each item's stable identity. Can be any attribute name.                                                                |
| `disabled`      | `boolean \| (() => boolean)`             | —                | When truthy, `dragstart` is blocked. If a drag is in progress when disabled becomes truthy, `onReorder` will not fire at drag end.                |
| `onDragStart`   | `(id: string, event: DragEvent) => void` | —                | Called at the start of a drag. `id` is the identity attribute value of the item being dragged.                                                    |
| `onDragEnd`     | `(event: DragEvent) => void`             | —                | Called when a drag ends, whether completed or cancelled.                                                                                          |
| `onReorder`     | `(orderedIds: string[]) => void`         | —                | Called with the new order of identity values after a successful drop. Only fires when the order actually changed.                                 |

**Returns:** `Sortable`

```ts
const sortable = createSortable({
  element: listEl,
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

### `sortable.destroy()`

`destroy(): void`

Removes all event listeners from the container, strips `draggable` and `role` attributes from sortable items, and cleans up any in-progress drag state (removes `data-dragging` attribute, removes the placeholder element).

Note: the container's `role="list"` attribute is currently left in place after `destroy()`.

### `sortable[Symbol.dispose]()`

`[Symbol.dispose](): void`

Alias for `destroy()`.

---

## DOM Attributes

Dragit reads and writes the following DOM attributes:

| Attribute            | Set by                              | Removed by              | Description                                                                                       |
| -------------------- | ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| `data-sort-id`       | You                                          | —                       | Default identity attribute on each sortable item. Configurable via `itemAttribute`.                                              |
| `draggable`          | `createSortable` init / `MutationObserver`   | `destroy()`             | Enables native drag on each item (or its handle when `handle` is set).                                                          |
| `role="list"`        | `createSortable` init                        | —                       | Accessibility role on the container.                                                                                             |
| `role="listitem"`    | `createSortable` init / `MutationObserver`   | `destroy()`             | Accessibility role on each item.                                                                                                 |
| `data-dragging`      | During drag                                  | `dragend` / `destroy()` | Applied to the item currently being dragged. The item is hidden (`opacity: 0`) automatically while dragging.                    |
| `aria-hidden="true"` | On placeholder creation             | Placeholder removal     | Applied to the `.dragit-placeholder` element.                                                     |

## CSS Classes

| Class                | Applied to                   | When                                                          |
| -------------------- | ---------------------------- | ------------------------------------------------------------- |
| `dragit-placeholder` | `<div>` inserted by sortable | While an item is being dragged, in the placeholder's position |
