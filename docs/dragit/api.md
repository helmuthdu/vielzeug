---
title: Dragit — API Reference
description: Complete API reference for Dragit with type signatures, option documentation, and return value descriptions.
---

[[toc]]

## API At a Glance

| Symbol                   | Purpose                                      | Execution mode | Common gotcha                                                     |
| ------------------------ | -------------------------------------------- | -------------- | ----------------------------------------------------------------- |
| `createDropZone()`       | Create a typed drop-zone controller          | Sync           | Remember to destroy the controller during teardown                |
| `createSortable()`       | Add sortable drag-and-drop behavior to lists | Sync           | Provide stable item identity for reorder operations               |
| `applyReorder()`         | Apply ordered IDs to data arrays             | Sync           | Unknown IDs are skipped; non-mentioned items are appended         |
| `DropZoneOptions.accept` | Filter file types before processing          | Sync           | Mismatch between MIME and extension can reject files unexpectedly |

## Types

### `Disposable`

```ts
interface Disposable {
  destroy(): void;
  [Symbol.dispose](): void;
}
```

### `DropZoneOptions`

```ts
interface DropZoneOptions {
  element: HTMLElement;
  accept?: string[] | (() => string[]);
  disabled?: boolean | (() => boolean);
  dropEffect?: DataTransfer['dropEffect'];
  onDrop?: (files: File[], event: DragEvent) => void;
  onDropRejected?: (files: File[], event: DragEvent) => void;
  onHoverChange?: (hovered: boolean) => void;
}
```

### `DropZone`

```ts
interface DropZone extends Disposable {
  readonly hovered: boolean;
  readonly files: readonly File[];
  readonly rejected: readonly File[];
}
```

### `SortableOptions`

```ts
interface SortableOptions {
  element: HTMLElement;
  group?: string;
  handle?: string;
  keyboard?: boolean;
  itemAttribute?: string;
  axis?: 'vertical' | 'horizontal';
  autoScroll?: boolean | AutoScrollOptions;
  dragImage?: HTMLElement | ((id: string, item: HTMLElement, event: DragEvent) => HTMLElement | null | undefined);
  placeholderClass?: string;
  disabled?: boolean | (() => boolean);
  onDragStart?: (id: string, event: DragEvent) => void;
  onDragEnd?: (id: string, event: DragEvent) => void;
  onReorder?: (orderedIds: string[]) => void;
}
```

### `AutoScrollOptions`

```ts
interface AutoScrollOptions {
  edgeThreshold?: number;
  speed?: number;
}
```

### `Sortable`

```ts
interface Sortable extends Disposable {
  readonly isDragging: boolean;
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
| `accept`         | `string[] \| (() => string[])`             | `[]`     | Accepted file types. Empty array accepts everything. Each entry is a MIME type (`'image/png'`), MIME wildcard (`'image/*'`), or file extension (`'.pdf'`). |
| `disabled`       | `boolean \| (() => boolean)`                | —        | When truthy, all drag events are ignored and hover state does not change. Accepts a boolean or a function for reactive framework integration.              |
| `dropEffect`     | `'copy' \| 'move' \| 'link' \| 'none'`      | `'copy'` | The `dropEffect` set on `dataTransfer` during `dragover`. Controls the cursor indicator.                                                                   |
| `onDrop`         | `(files: File[], event: DragEvent) => void` | —        | Called with accepted files only. Not called if all dropped files are rejected.                                                                             |
| `onDropRejected` | `(files: File[], event: DragEvent) => void` | —        | Called with files that did not match `accept`. Not called if all files are accepted.                                                                       |
| `onHoverChange`  | `(hovered: boolean) => void`                | —        | Called when hover state toggles. Use this callback for drag-over styling.                                                                                  |

**Returns:** `DropZone`

Notes:

- Extension accept patterns are approximate during pre-check (`DataTransferItem` has no filename); exact filtering is applied at drop time.
- Hover state is reset on element drop and also global `window` `drop`/`dragend` to avoid stuck hover state when drags leave the viewport.

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

### `zone.files`

`readonly files: readonly File[]`

Accepted files from the last drop.

### `zone.rejected`

`readonly rejected: readonly File[]`

Rejected files from the last drop.

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

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `element` | `HTMLElement` | — | **Required.** The container whose identity-attribute children become sortable. |
| `group` | `string` | — | Connects sortable lists. Containers with the same group name can exchange items. |
| `handle` | `string` | — | CSS selector for a drag handle inside each item. When omitted, the whole item is draggable. `draggable` is set on the handle element, not the item. |
| `keyboard` | `boolean` | `true` | Enables keyboard reordering (Arrow keys + Home/End) for focused items. |
| `itemAttribute` | `string` | `'data-sort-id'` | The attribute used to read each item's stable identity. Can be any attribute name. |
| `axis` | `'vertical' \| 'horizontal'` | `'vertical'` | Axis used to compute placeholder insertion midpoint (`clientY` for vertical, `clientX` for horizontal). |
| `autoScroll` | `boolean \| AutoScrollOptions` | `true` | Auto-scrolls near container/viewport edges while dragging. |
| `dragImage` | `HTMLElement \| ((id, item, event) => HTMLElement \| null \| undefined)` | — | Custom native drag preview element passed to `dataTransfer.setDragImage()`. |
| `placeholderClass` | `string` | `'dragit-placeholder'` | CSS class applied to the generated placeholder element while dragging. |
| `disabled` | `boolean \| (() => boolean)` | — | When truthy, `dragstart` is blocked. If a drag is in progress when disabled becomes truthy, `onReorder` will not fire at drag end. |
| `onDragStart` | `(id: string, event: DragEvent) => void` | — | Called at the start of a drag. `id` is the identity attribute value of the item being dragged. |
| `onDragEnd` | `(id: string, event: DragEvent) => void` | — | Called when a drag ends, whether completed or cancelled. |
| `onReorder` | `(orderedIds: string[]) => void` | — | Called with the new order of identity values after a successful drop. Only fires when the order actually changed. |

**Returns:** `Sortable`

```ts
const sortable = createSortable({
  element: listEl,
  group: 'kanban',
  handle: '.drag-handle',
  onDragStart: (id) => {
    listEl.classList.add('sorting');
  },
  onDragEnd: (id) => {
    listEl.classList.remove('sorting');
  },
  onReorder: (ids) => {
    saveOrder(ids);
  },
});
```

---

## `Sortable` Interface

### `sortable.isDragging`

`readonly isDragging: boolean`

`true` while an item drag is in progress.

### `sortable.destroy()`

`destroy(): void`

Removes all event listeners from the container, strips `draggable` and `role` attributes from sortable items, and cleans up any in-progress drag state (removes `data-dragging` attribute, removes the placeholder element).

`destroy()` also removes the container's `role="list"` attribute.

### `sortable[Symbol.dispose]()`

`[Symbol.dispose](): void`

Alias for `destroy()`.

---

## DOM Attributes

Dragit reads and writes the following DOM attributes:

| Attribute | Set by | Removed by | Description |
| --- | --- | --- | --- |
| `data-sort-id` | You | — | Default identity attribute on each sortable item. Configurable via `itemAttribute`. |
| `draggable` | `createSortable` init / `MutationObserver` | `destroy()` | Enables native drag on each item (or its handle when `handle` is set). |
| `role="list"` | `createSortable` init | `destroy()` | Accessibility role on the container. |
| `role="listitem"` | `createSortable` init / `MutationObserver` | `destroy()` | Accessibility role on each item. |
| `data-dragging` | During drag | `dragend` / `destroy()` | Applied to the item currently being dragged. Use it as your styling hook for visual drag state. |
| `aria-hidden="true"` | On placeholder creation | Placeholder removal | Applied to the `.dragit-placeholder` element. |

## CSS Classes

| Class                | Applied to                   | When                                                          |
| -------------------- | ---------------------------- | ------------------------------------------------------------- |
| `dragit-placeholder` | `<div>` inserted by sortable | While an item is being dragged, in the placeholder's position |

## `applyReorder()`

```ts
declare function applyReorder<T>(
  items: T[],
  ids: string[],
  getId: (item: T) => string,
): T[];
```

Applies a DOM reorder result (`orderedIds`) to your backing array.

- IDs missing from `items` are ignored.
- Items not listed in `ids` are appended in original order.

```ts
const next = applyReorder(items, orderedIds, (item) => item.id);
```
