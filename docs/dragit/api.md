---
title: Dragit — API Reference
description: Complete API reference for Dragit with type signatures, option documentation, and return value descriptions.
---

[[toc]]

## Package Entry Point

| Import               | Purpose                |
| -------------------- | ---------------------- |
| `@vielzeug/dragit`   | Main exports and types |

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
  scope?: SortableScope;
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
interface SortableScope {}
```

```ts
interface AutoScrollOptions {
  edgeThreshold?: number;
  speed?: number;
  container?: boolean;
  viewport?: boolean;
}
```

### `Sortable`

```ts
interface Sortable extends Disposable {
  readonly isDragging: boolean;
  sync(): void;
}
```

### `SortableScope`

```ts
declare function createSortableScope(): SortableScope;
```

Creates an explicit connection scope for multi-container sorting. Containers only exchange items when they share the same scope instance.

---

## `createDropZone()`

```ts
declare function createDropZone(options: DropZoneOptions): DropZone;
```

Attaches drag-and-drop file handling to a DOM element. Returns a `DropZone` handle.

| Option           | Type                                        | Default  | Description                                                                                                                                                |
| ---------------- | ------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `element`        | `HTMLElement`                               | —        | **Required.** The element to attach drag listeners to.                                                                                                     |
| `accept`         | `string[] \| (() => string[])`              | `[]`     | Accepted file types. Empty array accepts everything. Each entry is a MIME type (`'image/png'`), MIME wildcard (`'image/*'`), or file extension (`'.pdf'`). |
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

`createSortable` sets `draggable="true"` and `role="listitem"` on qualifying children and sets `role="list"` on the container at initialization. After DOM mutations, call `sortable.sync()` to re-apply sortable attributes explicitly.

- `element`: `HTMLElement`, required. The container whose identity-attribute children become sortable.
- `scope`: `SortableScope`, default private scope. Connects sortable lists explicitly; containers only exchange items when they share the same scope instance.
- `handle`: `string`. CSS selector for a drag handle inside each item. When omitted, the whole item is draggable.
- `keyboard`: `boolean`, default `true`. Enables keyboard reordering with arrow keys plus `Home` and `End`.
- `itemAttribute`: `string`, default `'data-sort-id'`. The attribute used to read each item's stable identity.
- `axis`: `'vertical' | 'horizontal'`, default `'vertical'`. Controls midpoint calculation for placeholder insertion.
- `autoScroll`: `boolean | AutoScrollOptions`, default `true`. Scrolls the container near its edges; enable viewport scrolling with `autoScroll.viewport`.
- `dragImage`: `HTMLElement | ((id, item, event) => HTMLElement | null | undefined)`. Custom native drag preview passed to `dataTransfer.setDragImage()`.
- `placeholderClass`: `string`, default `'dragit-placeholder'`. CSS class applied to the generated placeholder element.
- `disabled`: `boolean | (() => boolean)`. Blocks drag interactions. If a list becomes disabled mid-drag, Dragit cancels the drag and restores the original order.
- `onDragStart`: `(id: string, event: DragEvent) => void`. Called when a drag starts.
- `onDragEnd`: `(id: string, event: DragEvent) => void`. Called when a drag ends, whether completed or cancelled.
- `onReorder`: `(orderedIds: string[]) => void`. Called with the new order after a successful drop, only when the order actually changed.

**Returns:** `Sortable`

```ts
const boardScope = createSortableScope();

const sortable = createSortable({
  element: listEl,
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
  scope: boardScope,
});
```

### `createSortableScope()`

```ts
declare function createSortableScope(): SortableScope;
```

Use one scope per connected set of containers. Sortables without an explicit scope use a private scope and remain isolated.

---

## `Sortable` Interface

### `sortable.isDragging`

`readonly isDragging: boolean`

`true` while an item drag is in progress.

### `sortable.sync()`

`sync(): void`

Re-applies `draggable`, `role`, and handle attributes after DOM mutations. Call it after adding, removing, or replacing sortable children.

### `sortable.destroy()`

`destroy(): void`

Removes all event listeners from the container, strips sortable attributes from items and handles, and cancels any in-progress drag by restoring the original order.

### `sortable[Symbol.dispose]()`

`[Symbol.dispose](): void`

Alias for `destroy()`.

---

## DOM Attributes

Dragit reads and writes the following DOM attributes:

- `data-sort-id`: supplied by you. Default identity attribute on each sortable item. Configurable via `itemAttribute`.
- `draggable`: set by `createSortable` and `sortable.sync()`, removed by `destroy()`. Enables native drag on each item or handle.
- `role="list"`: set by `createSortable`, removed by `destroy()`. Accessibility role on the container.
- `role="listitem"`: set by `createSortable` and `sortable.sync()`, removed by `destroy()`. Accessibility role on each item.
- `data-dragging`: set during drag, removed on `dragend` or `destroy()`. Use it as your styling hook for drag state.
- `data-dragit-handle`: internal marker set by `createSortable` and `sortable.sync()`, removed by `destroy()`. Lets Dragit clean up only the handle attributes it applied.
- `aria-hidden="true"`: set on placeholder creation and removed with the placeholder. Applied to the `.dragit-placeholder` element.

## CSS Classes

| Class                | Applied to                   | When                                                          |
| -------------------- | ---------------------------- | ------------------------------------------------------------- |
| `dragit-placeholder` | `<div>` inserted by sortable | While an item is being dragged, in the placeholder's position |

## `applyReorder()`

```ts
declare function applyReorder<T>(items: T[], ids: string[], getId: (item: T) => string): T[];
```

Applies a DOM reorder result (`orderedIds`) to your backing array.

- IDs missing from `items` are ignored.
- Items not listed in `ids` are appended in original order.

```ts
const next = applyReorder(items, orderedIds, (item) => item.id);
```
