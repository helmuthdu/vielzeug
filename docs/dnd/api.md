---
title: Dnd — API Reference
description: Complete API reference for Dnd.
---

[[toc]]

## API Overview

| Symbol                     | Purpose                                      | Execution mode | Common gotcha                                                     |
| -------------------------- | -------------------------------------------- | -------------- | ----------------------------------------------------------------- |
| `createDropZone()`         | Create a typed drop-zone controller          | Sync           | Remember to destroy the controller during teardown                |
| `createSortable()`         | Add sortable drag-and-drop behavior to lists | Sync           | Provide stable item identity for reorder operations               |
| `createSortableScope()`    | Create a shared scope for connected lists    | Sync           | Each set of connected containers needs its own scope instance     |
| `applyReorder()`           | Apply ordered IDs to data arrays             | Sync           | Unknown IDs are skipped; non-mentioned items are appended         |
| `DropZoneOptions.accept`   | Filter file types before processing          | Sync           | Mismatch between MIME and extension can reject files unexpectedly |
| `DropZoneOptions.maxFiles` | Cap accepted files per drop                  | Sync           | Excess accepted files become rejected; `onDropRejected` is called |
| `matchesAccept()`          | Test a single `File` against an accept list  | Sync           | Extension patterns are case-insensitive; empty list accepts all   |

## Package Entry Point

| Import          | Purpose                |
| --------------- | ---------------------- |
| `@vielzeug/dnd` | Main exports and types |

## Types

### `Disposable`

```ts
interface Disposable {
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

### `DropZoneOptions`

```ts
interface DropZoneOptions {
  element: HTMLElement;
  accept?: string[];
  maxFiles?: number;
  onValidate?: (files: File[]) => boolean | Promise<boolean>;
  disabled?: boolean;
  dropEffect?: DataTransfer['dropEffect'];
  onDrop?: (files: File[]) => void;
  onDropRejected?: (files: File[]) => void;
  onHoverChange?: (hovered: boolean) => void;
  onValidatingChange?: (validating: boolean) => void;
  paste?: boolean;
  onPaste?: (files: File[]) => void;
}
```

### `DropZone`

```ts
interface DropZone extends Disposable {
  readonly hovered: boolean;
  readonly validating: boolean;
}
```

### `SortableOptions`

```ts
interface SortableOptions {
  element: HTMLElement;
  getKey: (element: HTMLElement) => string;
  scope?: SortableScope;
  handle?: string;
  keyboard?: boolean;
  axis?: 'vertical' | 'horizontal';
  autoScroll?: boolean | AutoScrollOptions;
  dragImage?: HTMLElement | ((id: string, item: HTMLElement, event: DragEvent) => HTMLElement | null | undefined);
  dragImageOffset?: [number, number];
  placeholderClass?: string;
  disabled?: boolean;
  onDragStart?: (id: string, event: DragEvent) => void;
  onDragEnd?: (id: string, event: DragEvent) => void;
  onBeforeReorder?: (from: string[], to: string[]) => void;
  onReorder?: (event: ReorderEvent) => void;
}
```

### `AutoScrollOptions`

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
  revert(): void;
  sync(): void;
}
```

### `SortableScope`

```ts
declare function createSortableScope(): SortableScope;
```

Creates an explicit connection scope for multi-container sorting. Containers only exchange items when they share the same scope instance.

## `createDropZone()`

```ts
declare function createDropZone(options: DropZoneOptions): DropZone;
```

Attaches drag-and-drop file handling to a DOM element. Returns a `DropZone` handle.

| Option           | Type                                             | Default  | Description                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `element`        | `HTMLElement`                                    | —        | **Required.** The element to attach drag listeners to.                                                                                                                                                                                           |
| `accept`         | `string[]`                                       | `[]`     | Accepted file types. Empty array accepts everything. Each entry is a MIME type (`'image/png'`), MIME wildcard (`'image/*'`), or file extension (`'.pdf'`).                                                                                       |
| `maxFiles`       | `number`                                         | —        | Maximum files accepted per drop. Files beyond this limit are passed to `onDropRejected`. When omitted there is no limit.                                                                                                                         |
| `onValidate`     | `(files: File[]) => boolean \| Promise<boolean>` | —        | Optional async gating step. Called after type/`accept`/`maxFiles` filtering, before `onDrop`. Return or resolve `false` to reject all accepted files. `zone.validating` is `true` while a promise is pending. Only receives type-accepted files. |
| `disabled`       | `boolean`                                        | —        | When `true`, all drag and paste events are ignored. A disabled zone does not call `preventDefault` on `dragenter`, `dragover`, `drop`, or `paste`, so underlying elements (text editors, etc.) receive them normally.                            |
| `dropEffect`     | `'copy' \| 'move' \| 'link' \| 'none'`           | `'copy'` | The `dropEffect` set on `dataTransfer` during `dragover`. Controls the cursor indicator.                                                                                                                                                         |
| `onDrop`         | `(files: File[]) => void`                        | —        | Called with accepted files only. Not called if all dropped files are rejected. Also receives paste events when `paste: true` and `onPaste` is omitted.                                                                                           |
| `onDropRejected` | `(files: File[]) => void`                        | —        | Called with files that did not match `accept`, exceeded `maxFiles`, or were rejected by `onValidate`.                                                                                                                                            |
| `onHoverChange`  | `(hovered: boolean) => void`                     | —        | Called when hover state toggles. Use this callback for drag-over styling.                                                                                                                                                                        |
| `paste`          | `boolean`                                        | `false`  | When `true`, attaches a `paste` listener to `window`. Pasted files run through the same `accept`, `maxFiles`, and `onValidate` pipeline as dropped files.                                                                                        |
| `onPaste`        | `(files: File[]) => void`                        | —        | Called when files are pasted from the clipboard. Falls back to `onDrop` when omitted. Only active when `paste: true`.                                                                                                                            |

**Returns:** `DropZone`

Notes:

- Extension accept patterns are approximate during pre-check (`DataTransferItem` has no filename); exact filtering is applied at drop time.
- Hover state (`hovered`) only becomes `true` when the dragged payload passes the `accept` filter. Drags carrying rejected file types enter and leave the zone without triggering `onHoverChange`.
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

## `DropZone` Interface

### `zone.hovered`

`readonly hovered: boolean`

`true` when a drag is currently over the zone. Updated synchronously by the internal counter — safe to read at any time.

### `zone.validating`

`readonly validating: boolean`

`true` while an `onValidate` promise is pending. Use this to render a loading indicator between file selection and the acceptance/rejection callbacks firing.

```ts
console.log(zone.validating); // true between drop and onValidate resolution
```

### `zone.disposed`

`readonly disposed: boolean`

`true` once `dispose()` has been called. Safe to read at any time.

### `zone.disposalSignal`

`readonly disposalSignal: AbortSignal`

An `AbortSignal` that fires when `dispose()` is called. Use it to cancel in-flight requests tied to the zone's lifetime.

### `zone.dispose()`

`dispose(): void`

Removes all event listeners from the element, resets the drag counter and hover state, and clears the `hovered` flag. Idempotent — safe to call multiple times.

```ts
zone.dispose();
```

### `zone[Symbol.dispose]()`

`[Symbol.dispose](): void`

Alias for `dispose()`. Called automatically when used with the `using` keyword.

```ts
{
  using zone = createDropZone({ element: dropEl, onDrop: handleFiles });
} // zone.dispose() runs here
```

## `createSortable()`

```ts
declare function createSortable(options: SortableOptions): Sortable;
```

Makes the direct children of a container element reorderable via drag. Returns a `Sortable` handle.

`createSortable` sets `draggable="true"` and `role="listitem"` on qualifying children and sets `role="list"` on the container at initialization. After DOM mutations, call `sortable.sync()` to re-apply sortable attributes explicitly.

- `element`: `HTMLElement`, required. The container whose children become sortable.
- `getKey`: `(element: HTMLElement) => string`, required. Maps each item element to its stable string identity. Children for which `getKey` returns a falsy value are skipped.
- `scope`: `SortableScope`, default private scope. Connects sortable lists explicitly; containers only exchange items when they share the same scope instance.
- `handle`: `string`. CSS selector for a drag handle inside each item. When omitted, the whole item is draggable.
- `keyboard`: `boolean`, default `true`. Enables keyboard reordering with arrow keys plus `Home` and `End`.
- `axis`: `'vertical' | 'horizontal'`, default `'vertical'`. Controls midpoint calculation for placeholder insertion.
- `autoScroll`: `boolean | AutoScrollOptions`, default `true`. Scrolls the container near its edges; enable viewport scrolling with `autoScroll.viewport`.
- `dragImage`: `HTMLElement | ((id, item, event) => HTMLElement | null | undefined)`. Custom native drag preview passed to `dataTransfer.setDragImage()`. A `null` or `undefined` return skips `setDragImage` entirely.
- `dragImageOffset`: `[number, number]`, default `[0, 0]`. The `[x, y]` hotspot offset passed to `setDragImage`. Controls which point of the preview image follows the cursor.
- `placeholderClass`: `string`, default `'dnd-placeholder'`. CSS class applied to the generated placeholder element.
- `disabled`: `boolean`. Blocks drag interactions. If a list becomes disabled mid-drag, Dnd cancels the drag and restores the original order.
- `onDragStart`: `(id: string, event: DragEvent) => void`. Called when a drag starts.
- `onDragEnd`: `(id: string, event: DragEvent) => void`. Called when a drag ends, whether completed or cancelled.
- `onBeforeReorder`: `(from: string[], to: string[]) => void`. Called with the before/after order snapshots just before a successful reorder commits — for both drag and keyboard. Items are still in their pre-commit positions at the time of the call, making it ideal for FLIP animation setup.
- `onReorder`: `(event: ReorderEvent) => void`. Called after a successful reorder (drag or keyboard), only when the order changed. Use `event.setRevert(fn)` to register a revert function that `sortable.revert()` will invoke.

**Returns:** `Sortable`

```ts
const boardScope = createSortableScope();

const sortable = createSortable({
  element: listEl,
  getKey: (el) => el.dataset.id!,
  handle: '.drag-handle',
  onDragStart: (id) => {
    listEl.classList.add('sorting');
  },
  onDragEnd: (id) => {
    listEl.classList.remove('sorting');
  },
  onReorder: ({ ids, setRevert }) => {
    const prev = currentOrder;
    saveOrder(ids);
    setRevert(() => saveOrder(prev));
  },
  scope: boardScope,
});
```

### `createSortableScope()`

```ts
declare function createSortableScope(): SortableScope;
```

Use one scope per connected set of containers. Sortables without an explicit scope use a private scope and remain isolated.

## `Sortable` Interface

### `sortable.isDragging`

`readonly isDragging: boolean`

`true` while an item drag is in progress.

### `sortable.revert()`

`revert(): void`

Calls the revert function registered via `setRevert` in the last `onReorder` invocation (if any) and clears it. A no-op when no revert function was registered or it has already been consumed. Works for both drag-based and keyboard-based reorders.

Only the most recent reorder can be reverted — a new reorder overwrites the stored function.

```ts
const sortable = createSortable({
  element: listEl,
  getKey: (el) => el.dataset.sortId!,
  onReorder: ({ ids, setRevert }) => {
    const prev = currentOrder;
    setOrder(ids);
    setRevert(() => setOrder(prev)); // ← enable revert
  },
});

// On server error:
try {
  await api.saveOrder(ids);
} catch {
  sortable.revert();
}
```

### `sortable.sync()`

`sync(): void`

Re-applies `draggable`, `role`, and handle attributes after DOM mutations. Call it after adding, removing, or replacing sortable children.

### `sortable.disposed`

`readonly disposed: boolean`

`true` once `dispose()` has been called.

### `sortable.disposalSignal`

`readonly disposalSignal: AbortSignal`

An `AbortSignal` that fires when `dispose()` is called.

### `sortable.dispose()`

`dispose(): void`

Removes all event listeners from the container, strips sortable attributes from items and handles, and cancels any in-progress drag by restoring the original order. Idempotent — safe to call multiple times.

### `sortable[Symbol.dispose]()`

`[Symbol.dispose](): void`

Alias for `dispose()`.

## DOM Attributes

Dnd reads and writes the following DOM attributes:

- `data-dnd-item`: internal marker applied by `createSortable` to children that return a truthy key from `getKey`. Removed by `dispose()`.
- `draggable`: set by `createSortable` and `sortable.sync()`, removed by `dispose()`. Enables native drag on each item or handle.
- `role="list"`: set by `createSortable`, removed by `dispose()`. Accessibility role on the container.
- `role="listitem"`: set by `createSortable` and `sortable.sync()`, removed by `dispose()`. Accessibility role on each item.
- `data-dragging`: set during drag, removed on `dragend` or `dispose()`. Use it as your styling hook for drag state.
- `data-dnd-handle`: internal marker set by `createSortable` and `sortable.sync()`, removed by `dispose()`. Lets Dnd clean up only the handle attributes it applied.
- `aria-hidden="true"`: set on placeholder creation and removed with the placeholder. Applied to the `.dnd-placeholder` element.

## CSS Classes

| Class             | Applied to                   | When                                                          |
| ----------------- | ---------------------------- | ------------------------------------------------------------- |
| `dnd-placeholder` | `<div>` inserted by sortable | While an item is being dragged, in the placeholder's position |

## `matchesAccept()`

```ts
declare function matchesAccept(file: File, accept: string[]): boolean;
```

Tests whether a `File` matches an accept pattern list. Each pattern can be:

- A MIME type: `'image/png'`
- A MIME wildcard: `'image/*'`
- A file extension: `'.pdf'`

An empty list accepts everything. Extension matching is case-insensitive.

```ts
import { matchesAccept } from '@vielzeug/dnd';

matchesAccept(file, ['image/*', '.pdf']); // true or false
```

## `applyReorder()`

```ts
declare function applyReorder<T>(items: T[], ids: string[], getKey: (item: T) => string): T[];
```

Applies a DOM reorder result (`orderedIds`) to your backing array.

- IDs missing from `items` are ignored.
- Items not listed in `ids` are appended in original order.
- Duplicate IDs in `ids` — first occurrence wins, later occurrences are ignored.

```ts
const next = applyReorder(items, orderedIds, (item) => item.id);
```
