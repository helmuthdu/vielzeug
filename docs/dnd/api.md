---
title: Dnd — API Reference
description: Complete API reference for Dnd.
---

[[toc]]

## API Overview

| Symbol                     | Purpose                                      | Execution mode | Common gotcha                                                     |
| -------------------------- | -------------------------------------------- | -------------- | ----------------------------------------------------------------- |
| `createDropZone()`         | Create a typed drop-zone controller          | Sync           | Dispose the controller during teardown                            |
| `createSortable()`         | Add sortable drag-and-drop behavior to lists | Sync           | Provide stable item identity for reorder operations               |
| `createSortableScope()`    | Create a shared scope for connected lists    | Sync           | Each set of connected containers needs its own scope instance     |
| `applyReorder()`           | Apply ordered IDs to data arrays             | Sync           | Unknown IDs are skipped; non-mentioned items are appended         |
| `DropZoneOptions.accept`   | Filter file types before processing          | Sync           | Mismatch between MIME and extension can reject files unexpectedly |
| `DropZoneOptions.maxFiles` | Cap accepted files per drop                  | Sync           | Excess accepted files become rejected; `onDropRejected` is called |
| `matchesAccept()`          | Test a single `File` against an accept list  | Sync           | Extension patterns are case-insensitive; empty list accepts all   |
| `DndError`                 | Base class for Dnd errors                    | Sync           | Use `instanceof DndError` to narrow unknown errors                |

## Package Entry Point

| Import              | Purpose                          |
| ------------------- | -------------------------------- |
| `@vielzeug/dnd`     | Backward-compat root barrel      |
| `@vielzeug/dnd/drop` | Drop-zone APIs plus `DndError` and `Disposable` |
| `@vielzeug/dnd/sortable` | Sortable APIs plus `DndError`, `DndScopeError`, and `Disposable` |

Dnd has no third-party runtime dependencies. Its sortable touch adapter uses `@vielzeug/gesture` for shared pointer recognition.

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
  accept?: readonly string[];
  maxFiles?: number;
  onValidate?: (files: File[], context: DropValidationContext) => boolean | Promise<boolean>;
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

### `DropValidationContext`

```ts
interface DropValidationContext {
  readonly signal: AbortSignal;
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
  onInteraction?: (event: SortableInteractionEvent) => void;
  onBeforeReorder?: (from: readonly string[], to: readonly string[]) => void;
  onReorder?: (event: ReorderEvent) => void;
  items?: () => readonly HTMLElement[];
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

### `ReorderEvent`

```ts
interface ReorderEvent {
  before: readonly string[];
  after: readonly string[];
  item: string;
}
```

### `Sortable`

```ts
interface Sortable extends Disposable {
  readonly isDragging: boolean;
  refresh(): void;
}
```

### `SortableScope`

```ts
interface SortableScope extends Disposable {
  readonly isDragging: boolean;
}
```

### `SortableScopeOptions`

```ts
interface SortableScopeOptions {
  onMove?: (event: SortableMoveEvent) => void;
  touch?: boolean | SortableTouchOptions;
}
```

### `SortableMoveEvent`

```ts
interface SortableMoveEvent {
  readonly itemId: string;
  readonly source: HTMLElement;
  readonly sourceBeforeIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly target: HTMLElement;
  readonly targetBeforeIds: readonly string[];
  readonly targetIds: readonly string[];
}
```

### `SortableInteractionEvent`

Structured accessibility/observability event for sortable interactions. Drag emits `pickup` on dragstart, `drop` on commit, `cancel` on cancel. Keyboard emits `move` on each successful arrow/Home/End reorder (direct-commit model).

```ts
type SortableInteractionEvent =
  | { readonly type: 'pickup'; readonly itemId: string; readonly index: number; readonly total: number }
  | {
      readonly type: 'move';
      readonly itemId: string;
      readonly previousIndex: number;
      readonly index: number;
      readonly total: number;
    }
  | { readonly type: 'drop'; readonly itemId: string; readonly index: number; readonly total: number }
  | { readonly type: 'cancel'; readonly itemId: string; readonly index: number; readonly total: number };
```

Wire a consumer-side announcer to provide screen-reader feedback:

```ts
import { createSortable } from '@vielzeug/dnd/sortable';

createSortable({
  element: listEl,
  getKey: (el) => el.dataset.id!,
  onInteraction(event) {
    switch (event.type) {
      case 'pickup':
        announce(`Picked up ${event.itemId}, position ${event.index + 1} of ${event.total}`);
        break;
      case 'move':
        announce(`Moved ${event.itemId} to position ${event.index + 1} of ${event.total}`);
        break;
      case 'drop':
        announce(`Dropped ${event.itemId} at position ${event.index + 1} of ${event.total}`);
        break;
      case 'cancel':
        announce(`Cancelled, ${event.itemId} returned to position ${event.index + 1} of ${event.total}`);
        break;
    }
  },
});
```

### `SortableTouchOptions`

```ts
type SortableTouchOptions = Readonly<{
  activationDistance?: number;
  preview?: false | ((item: HTMLElement) => HTMLElement | null);
}>
```

`activationDistance` is the non-negative finite movement threshold in pixels before touch sorting starts (default `6`). Invalid values throw `DndError`.

`preview` returns a template that Dnd clones before mounting it as a transient touch preview, so returning an element from the sortable item does not reparent or remove caller-owned DOM. Return `false` to disable the preview.

Touch sorting delegates one-pointer activation, movement, identity, and cancellation to Gesture's `createDragGesture()` with pointer capture disabled for document hit-testing. Dnd retains preview rendering, hit-testing, synthetic drag events, and sortable transactions. Non-primary pointers are ignored, and cancellation restores the pre-drag order without firing `onReorder`.

## `createDropZone()`

```ts
declare function createDropZone(options: DropZoneOptions): DropZone;
```

Attaches drag-and-drop file handling to a DOM element. Returns a `DropZone` handle.

| Option           | Type                                             | Default  | Description                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `element`        | `HTMLElement`                                    | —        | **Required.** The element to attach drag listeners to.                                                                                                                                                                                           |
| `accept`         | `string[]`                                       | `[]`     | Accepted file types, normalized and snapshotted at construction. Empty array accepts everything; invalid MIME, wildcard, or extension patterns throw `DndError`.                                                                                       |
| `maxFiles`       | `number`                                         | —        | Non-negative safe-integer file limit. Excess files are passed to `onDropRejected`; invalid values throw `DndError` during construction.                                                                                                                         |
| `onValidate`     | `(files, { signal }) => boolean \| Promise<boolean>` | —     | Optional async gating step. Return or resolve `false` to reject all accepted files. `validating` remains true until every operation settles; `signal` aborts on disposal. |
| `disabled`       | `boolean`                                        | —        | When `true`, all drag and paste events are ignored. A disabled zone does not call `preventDefault` on `dragenter`, `dragover`, `drop`, or `paste`, so underlying elements (text editors, etc.) receive them normally.                            |
| `dropEffect`     | `'copy' \| 'move' \| 'link' \| 'none'`           | `'copy'` | The `dropEffect` set on `dataTransfer` during `dragover`. Controls the cursor indicator.                                                                                                                                                         |
| `onDrop`         | `(files: File[]) => void`                        | —        | Called with accepted files only. Not called if all dropped files are rejected. Also receives paste events when `paste: true` and `onPaste` is omitted.                                                                                           |
| `onDropRejected` | `(files: File[]) => void`                        | —        | Called with files that did not match `accept`, exceeded `maxFiles`, or were rejected by `onValidate`.                                                                                                                                            |
| `onHoverChange`  | `(hovered: boolean) => void`                     | —        | Called when hover state toggles. Use this callback for drag-over styling.                                                                                                                                                                        |
| `onValidatingChange` | `(validating: boolean) => void`                | —        | Called whenever the aggregate async validation state changes. |
| `paste`          | `boolean`                                        | `false`  | When `true`, attaches a `paste` listener to `element`. Pasted files run through the same `accept`, `maxFiles`, and `onValidate` pipeline as dropped files.                                                                                        |
| `onPaste`        | `(files: File[]) => void`                        | —        | Called when files are pasted from the clipboard. Falls back to `onDrop` when omitted. Only active when `paste: true`.                                                                                                                            |

**Returns:** `DropZone`

Notes:

- Extension accept patterns are approximate during pre-check (`DataTransferItem` has no filename); exact filtering is applied at drop time.
- Hover state (`hovered`) only becomes `true` when the dragged payload passes the `accept` filter. Drags carrying rejected file types enter and leave the zone without triggering `onHoverChange`.
- Hover state is reset on element drop and also global `window` `drop`/`dragend` to avoid stuck hover state when drags leave the viewport.
- Disposal aborts validation and transitions `validating` to `false` before teardown completes.
- Consumer callback failures are reported through Dnd's development warning channel and never reclassify accepted files as rejected.

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

Removes all event listeners, aborts pending validation, and resets `hovered` and `validating`. Idempotent — safe to call multiple times.

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

`createSortable` adds drag and keyboard defaults only when callers have not already supplied semantics. Every changed attribute and inline style is restored to its prior value on disposal.

- `element`: `HTMLElement`, required. The container whose children become sortable.
- `getKey`: `(element: HTMLElement) => string`, required. Maps each item element to its stable string identity. Children for which `getKey` returns a falsy value are skipped.
- `scope`: `SortableScope`, default private scope. Connects sortable lists explicitly; containers only exchange items when they share the same scope instance.
- `handle`: `string`. Valid CSS selector for a drag handle inside each item. Invalid selectors throw `DndError`; an empty selector warns and disables dragging.
- `keyboard`: `boolean`, default `true`. Enables keyboard reordering with arrow keys plus `Home` and `End`. Events from interactive descendants are ignored unless they match the configured handle.
- `axis`: `'vertical' | 'horizontal'`, default `'vertical'`. Controls midpoint calculation for placeholder insertion.
- `autoScroll`: `boolean | AutoScrollOptions`, default `true`. Scrolls near edges; threshold must be finite and non-negative and speed finite and positive.
- `dragImage`: `HTMLElement | ((id, item, event) => HTMLElement | null | undefined)`. Custom native drag preview passed to `dataTransfer.setDragImage()`. A `null` or `undefined` return skips `setDragImage` entirely.
- `dragImageOffset`: `[number, number]`, default `[0, 0]`. The `[x, y]` hotspot offset passed to `setDragImage`. Controls which point of the preview image follows the cursor.
- `placeholderClass`: `string`, default `'dnd-placeholder'`. CSS class applied to the generated placeholder element.
- `disabled`: `boolean`. Blocks drag interactions. If a list becomes disabled mid-drag, Dnd cancels the drag and restores the original order.
- `onDragStart`: `(id: string, event: DragEvent) => void`. Called when a drag starts.
- `onDragEnd`: `(id: string, event: DragEvent) => void`. Called when a drag ends, whether completed or cancelled.
- `onInteraction`: `(event: SortableInteractionEvent) => void`. Structured accessibility event for pickup/move/drop/cancel — wire to a consumer-side announcer for screen-reader feedback. See [`SortableInteractionEvent`](#sortableinteractionevent).
- `onBeforeReorder`: `(from: readonly string[], to: readonly string[]) => void`. Called with the before/after order snapshots just before a successful reorder commits — for both drag and keyboard. Items are still in their pre-commit positions at the time of the call, making it ideal for [`captureLayout()`](/necromancer/api.md#capturelayout) setup.
- `items`: `() => readonly HTMLElement[]`. Returns direct children owned by this sortable. `refresh()` restores elements no longer returned before marking the current set.
- `onReorder`: `(event: ReorderEvent) => void`. Called after a successful reorder (drag or keyboard), only when the order changed. The event carries `before`, `after`, and `item` so application history can own rollback.

Order arrays and interaction events are frozen snapshots. Callback failures are reported through Dnd's development warning channel and cannot interrupt session completion or corrupt later events. Native touch scrolling is preserved unless the shared scope enables touch input.

**Returns:** `Sortable`

```ts
const boardScope = createSortableScope({
  onMove: ({ itemId, sourceIds, targetIds }) => saveMove(itemId, sourceIds, targetIds),
  touch: true,
});

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
  onReorder: ({ before, after }) => {
    history.push({ revert: () => saveOrder(before) });
    saveOrder(after);
  },
  scope: boardScope,
});
```

### `createSortableScope()`

```ts
declare function createSortableScope(options?: SortableScopeOptions): SortableScope;
```

Use one scope per connected set of containers. `onMove` fires once for cross-list moves with both final orders; local reorders continue to call the sortable's `onReorder`.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `SortableScopeOptions` | Optional cross-list move callback and scope-owned touch configuration |

**Returns:** `SortableScope`.

```ts
import { createSortableScope } from '@vielzeug/dnd/sortable';

const scope = createSortableScope({
  onMove: ({ itemId, sourceIds, targetIds }) => {
    persistMove(itemId, sourceIds, targetIds);
  },
  touch: true,
});
```

## `Sortable` Interface

### `sortable.isDragging`

`readonly isDragging: boolean`

`true` while an item drag is in progress.

### `sortable.refresh()`

`refresh(): void`

Re-reads items from the `items` provider (or the container's direct children) and reapplies `draggable`, `role`, and handle attributes. Call it after adding, removing, or replacing sortable children.

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

## `SortableScope` Interface

### `scope.isDragging`

`readonly isDragging: boolean`

`true` while any sortable registered to the scope is dragging.

### `scope.dispose()`

`dispose(): void`

Disposes scope-owned touch input and all registered sortables. Registering a new sortable with a disposed scope throws `DndScopeError`.

## DOM Attributes

Dnd reads and writes the following DOM attributes:

- `data-dnd-item`: internal marker applied by `createSortable` to children that return a truthy key from `getKey`. Restored on `dispose()`.
- `draggable`, roles, tabindex, and `touchAction`: managed only as needed and restored to their exact prior values on `dispose()`.
- `data-dragging`: set during drag, removed on `dragend` or `dispose()`. Use it as your styling hook for drag state.
- `data-dnd-handle`: internal marker set by `createSortable` and `sortable.refresh()`, removed by `dispose()`. Lets Dnd clean up only the handle attributes it applied.
- `aria-hidden="true"`: set on placeholder creation and removed with the placeholder. Applied to the `.dnd-placeholder` element.
- `style.touchAction = 'none'` (inline style): set by `createSortable` and `sortable.refresh()` on the item (or the handle, when `handle` is set), then restored on `dispose()`.

## CSS Classes

| Class             | Applied to                   | When                                                          |
| ----------------- | ---------------------------- | ------------------------------------------------------------- |
| `dnd-placeholder` | `<div>` inserted by sortable | While an item is being dragged, in the placeholder's position |

## `matchesAccept()`

```ts
declare function matchesAccept(file: File, accept: readonly string[]): boolean;
```

Tests whether a `File` matches an accept pattern list. Each pattern can be:

- A MIME type: `'image/png'`
- A MIME wildcard: `'image/*'`
- A file extension: `'.pdf'`

An empty list accepts everything. Extension matching is case-insensitive.

**Returns:** `true` when the file matches at least one pattern, or when `accept` is empty.

```ts
import { matchesAccept } from '@vielzeug/dnd/drop';

matchesAccept(file, ['image/*', '.pdf']); // true or false
```

## `applyReorder()`

```ts
declare function applyReorder<T>(items: readonly T[], ids: readonly string[], getKey: (item: T) => string): T[];
```

Applies a DOM reorder result (`orderedIds`) to your backing array.

- IDs missing from `items` are ignored.
- Items not listed in `ids` are appended in original order.
- Duplicate IDs in `ids` — first occurrence wins, later occurrences are ignored.
- Duplicate keys in `items` throw `DndError`; data is never silently discarded.

**Returns:** A new array ordered by `ids`, with omitted items appended in their original order.

```ts
const next = applyReorder(items, orderedIds, (item) => item.id);
```

## Errors

| Error | Trigger | Notable property |
| --- | --- | --- |
| `DndError` | Invalid configuration, duplicate item data, or duplicate sortable registration in one scope | Base class for package errors |
| `DndScopeError` | A sortable receives an invalid or disposed scope | Extends `DndError` |
