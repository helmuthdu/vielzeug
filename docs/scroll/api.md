---
title: Scroll — API Reference
description: Complete API reference for the Scroll virtual list engine.
---

[[toc]]

## API Overview

| Symbol                       | Purpose                                | Execution mode | Common gotcha                                                                         |
| ---------------------------- | -------------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `createVirtualizer()`        | Core 1D virtualizer                    | Sync           | `onChange` fires on construction — wire DOM first                                     |
| `createDomVirtualList()`     | DOM adapter for dropdown/listbox UIs   | Sync           | Virtualizer is created lazily on first `setItems()`                                   |
| `createVirtualScroller()`    | Self-contained scroller (creates DOM)  | Sync           | `dispose()` removes the generated scroll element                                      |
| `createGroupedVirtualizer()` | Sectioned list with sticky headers     | Sync           | `update()` preserves measured sizes — call `invalidate()` only on font/layout changes |
| `createGridVirtualizer()`    | Two-dimensional grid virtualizer       | Sync           | `onRangeChange` fires even when `onChange` is omitted                                 |

## Package Entry Point

Everything exports from a single entry:

```ts
import {
  createVirtualizer,
  createDomVirtualList,
  createVirtualScroller,
  createGroupedVirtualizer,
  createGridVirtualizer,
  createMeasurementCache,
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  ScrollError,
  ScrollConfigurationError,
  ScrollRangeError,
  type Virtualizer,
  type VirtualItem,
  type VirtualizerState,
  type VirtualizerOptions,
  type VirtualizerUpdateOptions,
  type ScrollToIndexOptions,
  type Overscan,
  type VirtualKey,
  type MeasurementCache,
  type ScrollTarget,
  type DomVirtualListOptions,
  type DomVirtualListController,
  type DomVirtualListRenderArgs,
  type RecycleFn,
  type VirtualRenderItem,
  type StickToBottomOptions,
  type VirtualScrollerOptions,
  type GroupSection,
  type GroupVirtualizer,
  type GroupVirtualizerOptions,
  type GroupVirtualizerState,
  type GroupVirtualizerUpdateOptions,
  type GroupVirtualHeader,
  type GroupVirtualItem,
  type GridVirtualizer,
  type GridVirtualizerOptions,
  type GridVirtualizerState,
  type GridVirtualizerUpdateOptions,
  type GridRangeChangeEvent,
  type ScrollToCellOptions,
} from '@vielzeug/scroll';
```

## `createVirtualizer(target, options)`

```ts
createVirtualizer(target: ScrollTarget, options: VirtualizerOptions): Virtualizer;
```

Creates and immediately attaches a virtualizer to the provided scroll container. `onChange` fires synchronously on construction with the initial visible window. Call `dispose()` on unmount.

```ts
import { createVirtualizer } from '@vielzeug/scroll';

const rows = [{ label: 'Ada Lovelace' }, { label: 'Grace Hopper' }];
const scrollEl = document.querySelector<HTMLElement>('.scroll-container')!;
const listEl = document.querySelector<HTMLElement>('.list')!;

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 36,
  gap: 8,
  onChange: ({ items, totalSize }) => {
    listEl.style.height = `${totalSize}px`;
    listEl.replaceChildren();

    for (const item of items) {
      const row = document.createElement('div');
      row.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:${item.size}px;`;
      row.textContent = rows[item.index]?.label ?? '';
      listEl.appendChild(row);
    }
  },
});
```

### Parameters

| Parameter | Type                    | Description                 |
| --------- | ----------------------- | --------------------------- |
| `target`  | `HTMLElement \| Window` | Scroll container to observe |
| `options` | `VirtualizerOptions`    | Initial options             |

### `VirtualizerOptions`

| Option              | Type                                         | Default          | Description                                                                                |
| ------------------- | -------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `count`             | `number`                                     | required         | Total item count                                                                           |
| `estimateSize`      | `number \| (index: number) => number`        | `36`             | Fixed size or per-index estimate in pixels                                                 |
| `gap`               | `number`                                     | `0`              | Gap between adjacent items in pixels                                                       |
| `getItemKey`        | `(index: number) => string \| number`        | `index => index` | Stable key for the measurement cache                                                       |
| `horizontal`        | `boolean`                                    | `false`          | Virtualize along the X axis instead of Y                                                   |
| `initialOffset`     | `number`                                     | —                | Initial scroll position; applied once on construction                                      |
| `keyboardScroll`    | `boolean`                                    | `false`          | Enable keyboard navigation (Arrow/Page/Home/End keys)                                      |
| `autoMeasure`       | `boolean`                                    | `false`          | Automatically measure visible items via ResizeObserver                                     |
| `measurementCache`  | `MeasurementCache`                           | —                | Shared external cache for scroll restoration or SSR pre-measurement                        |
| `onChange`          | `(state: VirtualizerState) => void`          | —                | Called when the visible window changes; replace through `update()`.                         |
| `onScrollEnd`       | `(offset: number) => void`                   | —                | Called when scrolling settles; replace through `update()`. |
| `onScrollingChange` | `(isScrolling: boolean) => void`             | —                | Called when scroll activity starts or stops; replace through `update()`. |
| `overscan`          | `number \| { start?: number; end?: number }` | `3`              | Extra items outside the viewport; number = symmetric on both sides                         |
| `scrollEndDelay`    | `number`                                     | `150`            | Debounce delay (ms) used to detect scroll end when native `scrollend` is unavailable       |
| `signal`            | `(init: VirtualizerState) => Signal<VirtualizerState>` | —        | Optional signal factory to expose state as a reactive Signal                              |
| `sticky`            | `(index: number) => boolean`                 | —                | Mark an item as a sticky header (pinned at viewport top)                                   |

Callbacks and `scrollEndDelay` can be replaced through `update()`; `horizontal` and `initialOffset` remain construction-only.

**Returns:** `Virtualizer`

### `VirtualizerState`

```ts
interface VirtualizerState {
  readonly items: VirtualItem[];
  readonly stickyItems: VirtualItem[];
  readonly totalSize: number;
}
```

`items` contains the currently visible items plus overscan. `stickyItems` contains items marked sticky that are pinned at the viewport top.

### `Virtualizer` — read-only properties

| Property         | Type            | Description                                                 |
| ---------------- | --------------- | ----------------------------------------------------------- |
| `count`          | `number`        | Current item count                                          |
| `disposalSignal` | `AbortSignal`   | Aborted when `dispose()` is called                          |
| `disposed`       | `boolean`       | `true` after `dispose()` is called                          |
| `isScrolling`    | `boolean`       | `true` while the user is scrolling; `false` once settled    |
| `items`          | `VirtualItem[]` | Currently rendered items. Always populated.                 |
| `scrollOffset`   | `number`        | Current scroll position in pixels                           |
| `stickyItems`    | `VirtualItem[]` | Items pinned at the viewport top (requires `sticky` option) |
| `totalSize`      | `number`        | Total height (or width in horizontal mode)                  |

### `Virtualizer` — methods

| Method             | Signature                                                           | Description                                                          |
| ------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `update`           | `(next: VirtualizerUpdateOptions) => void`                          | Atomically update live options                                       |
| `measure`          | `(index: number, size: number) => void`                             | Record one measured size; rebuild batched in microtask               |
| `measureBatch`     | `(entries: Array<{ index: number; size: number }>) => void`         | Record many sizes; single rebuild                                    |
| `measureEl`        | `(index: number, el: HTMLElement) => () => void`                    | Attach ResizeObserver to auto-measure. Returns a disconnect function |
| `refresh`          | `() => void`                                                        | Rebuild offset table and re-emit; preserves cached measurements      |
| `prepend`          | `(additionalCount: number) => void`                                 | Add items at the top; adjusts scroll offset to keep viewport stable  |
| `scrollToIndex`    | `(index: number, options?: ScrollToIndexOptions) => void`           | Scroll to an item; out-of-range indices are clamped                  |
| `scrollToOffset`   | `(offset: number, options?: { behavior?: ScrollBehavior }) => void` | Scroll to a raw pixel offset                                         |
| `scrollToTop`      | `(options?: { behavior?: ScrollBehavior }) => void`                 | Scroll to offset `0`                                                 |
| `scrollToBottom`   | `(options?: { behavior?: ScrollBehavior }) => void`                 | Scroll to the end of the list                                        |
| `isAtEnd`          | `(threshold?: number) => boolean`                                   | `true` when within `threshold` px (default `0`) of the end — check before appending items to decide whether to auto-follow (chat "stick to bottom") |
| `invalidate`       | `() => void`                                                        | Clear all measurements and rebuild from estimates                    |
| `dispose`          | `() => void`                                                        | Detach listeners; idempotent                                         |
| `[Symbol.dispose]` | `() => void`                                                        | Delegates to `dispose()` — enables `using` declarations              |

### `update(next)`

Atomically updates one or more live options. Accepts: `autoMeasure`, `count`, `estimateSize`, `gap`, `getItemKey`, `keyboardScroll`, `measurementCache`, `onChange`, `onScrollEnd`, `onScrollingChange`, `overscan`, `scrollEndDelay`, and `sticky`. `horizontal` and `initialOffset` remain construction-only. Invalid static numeric values throw `ScrollConfigurationError` before any update applies.

When `estimateSize` changes, the measurement cache is cleared and a scroll anchor is applied to keep the current viewport position visually stable.

```ts
virt.update({ count: rows.length });
virt.update({ estimateSize: 40 });
virt.update({ gap: 8, overscan: { start: 5, end: 5 } });
```

### `measure(index, size)` and `measureBatch(entries)`

Report exact sizes for variable-height rows. Calls within one microtask tick coalesce into a single offset rebuild. `measure()` is a no-op when the new size equals the current effective size.

```ts
virt.measure(item.index, el.offsetHeight);

// Prefer measureBatch for ResizeObserver batches
virt.measureBatch(entries.map((e) => ({ index: Number(e.target.dataset.index), size: e.contentRect.height })));
```

### `measureEl(index, el)`

Attaches a `ResizeObserver` to auto-measure `el` on resize. Returns a disconnect function. The
observer is also disconnected automatically when the virtualizer is disposed, so calling the
returned function is only needed to stop observing a specific element early (e.g. before it is
recycled or removed).

```ts
const disconnect = virt.measureEl(item.index, rowEl);
// later: disconnect();
```

### `refresh()`

Rebuilds the full offset table and re-emits. Preserves cached measurements. Use after reordering, filtering, or any data change where sizes may have changed.

### `prepend(additionalCount)`

Adds `additionalCount` items at the front while adjusting scroll offset so the viewport stays visually stable. Use for "load previous page" patterns.

### `scrollToIndex(index, options?)`

Scroll to an item. Out-of-range indices are clamped silently.

| `align`            | Behavior                                                     |
| ------------------ | ------------------------------------------------------------ |
| `'start'`          | Item top at viewport top                                     |
| `'end'`            | Item bottom at viewport bottom                               |
| `'center'`         | Item centered in the viewport                                |
| `'auto'` (default) | No scroll if already fully visible; otherwise minimum scroll |

```ts
virt.scrollToIndex(0, { align: 'start' });
virt.scrollToIndex(500, { align: 'center', behavior: 'smooth' });
virt.scrollToIndex(focusedIndex, { align: 'auto' });
```

### `scrollToOffset(offset, options?)`

```ts
virt.scrollToOffset(Number(sessionStorage.getItem('scrollOffset') ?? '0'));
```

### `invalidate()`

Clears all measured sizes and rebuilds from estimator values.

```ts
document.fonts.ready.then(() => virt.invalidate());
```

### `dispose()` and `[Symbol.dispose]()`

`dispose()` detaches observers and event listeners. It is idempotent.

```ts
{
  using virt = createVirtualizer(scrollEl, { count: rows.length, onChange: render });
} // → dispose() called automatically
```

## `createDomVirtualList(options)`

```ts
createDomVirtualList<T>(options: DomVirtualListOptions<T>): DomVirtualListController<T>;
```

DOM-focused adapter. Manages virtualizer lifecycle, applies list-height styles automatically, and provides a node pool via `recycle`. The virtualizer is created lazily on the first non-empty `setItems()` call and destroyed automatically when `setItems([])` is called.

```ts
import { createDomVirtualList } from '@vielzeug/scroll';

const ctrl = createDomVirtualList<Row>({
  estimateSize: 36,
  getItemKey: (_, row) => row.id,
  listElement: listEl,
  scrollElement: scrollEl,
  render: ({ items, listEl, recycle }) => {
    for (const item of items) {
      const el = recycle(item.data.id, () => document.createElement('div'));
      el.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.start}px);height:${item.size}px;`;
      el.textContent = item.data.label;
      listEl.appendChild(el);
    }
  },
});

ctrl.setItems(rows);
ctrl.scrollToIndex(focusedIndex, { align: 'auto' });
ctrl.dispose();
```

### `DomVirtualListOptions<T>`

| Option             | Type                                          | Default  | Description                                                |
| ------------------ | --------------------------------------------- | -------- | ---------------------------------------------------------- |
| `scrollElement`    | `HTMLElement \| Window`                       | required | Scroll container to observe                                |
| `listElement`      | `HTMLElement`                                 | required | Element that receives height and item children             |
| `render`           | `(args: DomVirtualListRenderArgs<T>) => void` | required | Called on every visible-window change                      |
| `estimateSize`     | `number \| (index, item) => number`           | `36`     | Fixed or per-item size estimate                            |
| `gap`              | `number`                                      | `0`      | Gap between items in pixels                                |
| `getItemKey`       | `(index, item) => string \| number`           | —        | Stable key; keeps measurements across `setItems()` calls   |
| `horizontal`       | `boolean`                                     | `false`  | Virtualize along X axis                                    |
| `keyboardScroll`   | `boolean`                                     | `false`  | Enable keyboard navigation (Arrow/Page/Home/End keys)      |
| `measurementCache` | `MeasurementCache`                            | —        | External measurement cache                                 |
| `overscan`         | `number \| { start?: number; end?: number }`  | `3`      | Extra items outside the viewport; number = symmetric       |
| `signal`           | `(init: VirtualizerState) => Signal<VirtualizerState>` | — | Optional signal factory to expose state as a reactive Signal |
| `sticky`           | `(index: number, item: T) => boolean`         | —        | Mark items as sticky headers                               |
| `clear`            | `(listEl: HTMLElement) => void`               | —        | Custom teardown for listEl; defaults to `textContent = ''` |
| `stickToBottom`    | `boolean \| StickToBottomOptions`                       | —        | Auto-scroll to the end after `setItems()` whenever the list was already at (or near) the end — the chat "stick to bottom on new message" pattern |

Without `getItemKey`, each `setItems()` call drops cached measurements.

### `StickToBottomOptions`

| Option      | Type      | Default | Description                                                                |
| ----------- | --------- | ------- | --------------------------------------------------------------------------- |
| `enabled`   | `boolean` | `true`  | Enable/disable at runtime — pass the object form to toggle without removing it |
| `threshold` | `number`  | `48`    | Distance in pixels from the end still considered "at the end"              |

`stickToBottom` fires on **any** `setItems()` call made while the list is at the end — not just when the item count grows. This also follows a streaming last item that grows in place (same array length, bigger content) without you needing to detect that case yourself. It never fires while the user has scrolled away from the end, so reading older messages is never interrupted.

```ts
const chat = createDomVirtualList<Message>({
  estimateSize: 48,
  getItemKey: (_, m) => m.id,
  listElement: listEl,
  render: renderMessages,
  scrollElement: scrollEl,
  stickToBottom: true, // or { threshold: 80 } for a larger "still at bottom" tolerance
});

chat.setItems(messages); // scrolls to bottom on first load
// … later, a new message arrives (or the last one grows while streaming) …
chat.setItems([...messages, newMessage]); // follows along only if the user was already at the bottom
```

### `DomVirtualListRenderArgs<T>`

```ts
type DomVirtualListRenderArgs<T> = {
  items: Array<VirtualRenderItem<T>>; // visible items — each has .data + layout fields
  listEl: HTMLElement;
  recycle: RecycleFn; // node pool — returns existing node or calls create()
  stickyItems: Array<VirtualRenderItem<T>>; // sticky items (requires sticky option)
  totalSize: number;
};
```

`VirtualRenderItem<T>` is `VirtualItem` (`start`, `end`, `size`, `index`) enriched with `data: T`.

`recycle(key, create)` returns a live node for `key` if one exists in the pool, or calls `create()` for a new one. Nodes not reused in a render cycle are removed automatically. `listEl.style.height` is set before `render` is called — you do not need to set it yourself.

### `DomVirtualListController<T>`

Extends `Virtualizer` (minus `prepend` and `update`) with `setItems()`. All virtualizer methods and live getters are available directly.

| Member             | Description                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `setItems(items)`  | Set the current item array. Spawns virtualizer on first non-empty call; destroys it on `[]` |
| `count`            | Current item count (live getter)                                                            |
| `disposalSignal`   | `AbortSignal` aborted on `dispose()`                                                        |
| `isScrolling`      | `true` while the user is scrolling; `false` once settled (live getter)                      |
| `items`            | Currently rendered virtual items (live getter)                                              |
| `totalSize`        | Total list size in pixels (live getter)                                                     |
| `scrollOffset`     | Current scroll position (live getter)                                                       |
| `stickyItems`      | Sticky items pinned at viewport top (live getter)                                           |
| `measure`          | Delegate to underlying virtualizer; no-op before first `setItems`                           |
| `measureBatch`     | Batch measurement delegate                                                                  |
| `measureEl`        | Attach auto-measuring ResizeObserver                                                        |
| `refresh`          | Rebuild offset table and re-emit                                                            |
| `invalidate`       | Clear measurements and rebuild from estimates                                               |
| `scrollToIndex`    | Scroll to an item                                                                           |
| `scrollToOffset`   | Scroll to a pixel offset                                                                    |
| `scrollToTop`      | Scroll to offset `0`                                                                        |
| `scrollToBottom`   | Scroll to the end of the list                                                                |
| `isAtEnd`          | `true` when within `threshold` px of the end                                                |
| `dispose`          | Teardown; idempotent                                                                        |
| `disposed`         | `true` after `dispose()` is called (live getter)                                            |
| `[Symbol.dispose]` | Delegates to `dispose()`                                                                    |

## `createVirtualScroller(container, options)`

```ts
createVirtualScroller<T>(container: HTMLElement, options: VirtualScrollerOptions<T>): DomVirtualListController<T>;
```

Creates a scroll container `div` and inner list `div`, appends them to `container`, and returns a fully wired `DomVirtualListController`. Useful when the scroll DOM doesn't already exist.

```ts
const list = createVirtualScroller<Row>(document.getElementById('root')!, {
  estimateSize: 36,
  render: ({ items, listEl, recycle }) => {
    for (const item of items) {
      const el = recycle(item.data.id, () => document.createElement('div'));
      el.textContent = item.data.label;
      el.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.start}px);`;
      listEl.appendChild(el);
    }
  },
});

list.setItems(rows);
list.dispose(); // also removes the generated scroll container
```

`VirtualScrollerOptions<T>` is `DomVirtualListOptions<T>` minus `listElement`/`scrollElement`, plus:

| Option           | Type     | Description                                       |
| ---------------- | -------- | ------------------------------------------------- |
| `containerClass` | `string` | CSS class applied to the generated scroll element |

`dispose()` removes the generated scroll container from the DOM.

## `createGroupedVirtualizer(target, options)`

```ts
createGroupedVirtualizer<T>(target: ScrollTarget, options: GroupVirtualizerOptions<T>): GroupVirtualizer<T>;
```

Virtualizes a sectioned list. Headers are automatically sticky (pinned at viewport top while the section is in view).

```ts
import { createGroupedVirtualizer } from '@vielzeug/scroll';

type Contact = { id: number; name: string };

const virt = createGroupedVirtualizer<Contact>(scrollEl, {
  estimateHeaderSize: 32,
  estimateItemSize: 48,
  sections: [
    { label: 'A', items: [{ id: 1, name: 'Alice' }] },
    { label: 'B', items: [{ id: 2, name: 'Bob' }] },
  ],
  onChange: ({ headers, items, stickyHeader, totalSize }) => {
    listEl.style.height = `${totalSize}px`;
    listEl.replaceChildren();

    if (stickyHeader) {
      const el = document.createElement('div');
      el.className = 'sticky-header';
      el.textContent = stickyHeader.label;
      listEl.appendChild(el);
    }

    for (const header of headers) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${header.start}px;height:${header.size}px;`;
      el.textContent = header.label;
      listEl.appendChild(el);
    }

    for (const item of items) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${item.start}px;height:${item.size}px;`;
      el.textContent = item.data.name;
      listEl.appendChild(el);
    }
  },
});

virt.scrollToSection(1, { align: 'start' });
virt.update(nextSections);
virt.dispose();
```

### `GroupVirtualizerOptions<T>`

| Option               | Type                                                               | Default  | Description                                                             |
| -------------------- | ------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------- |
| `sections`           | `Array<GroupSection<T>>`                                           | required | Initial sections                                                        |
| `onChange`           | `(state: GroupVirtualizerState<T>) => void`                        | —        | Called when the visible window changes; replace through `update()`. |
| `onScrollEnd`        | `(offset: number) => void`                                         | —        | Called when scrolling settles; replace through `update()`. |
| `onScrollingChange`  | `(isScrolling: boolean) => void`                                   | —        | Called when scroll activity starts or stops; replace through `update()`. |
| `estimateHeaderSize` | `number \| (section, sectionIndex) => number`                      | `36`     | Header height estimate                                                  |
| `estimateItemSize`   | `number \| (item, itemIndex, sectionIndex) => number`              | `36`     | Item height estimate                                                    |
| `getItemKey`         | `(item: T, itemIndex: number, sectionIndex: number) => VirtualKey` | —        | Stable key for measurement cache                                        |
| `horizontal`         | `boolean`                                                          | `false`  | Virtualize along X axis                                                 |
| `measurementCache`   | `MeasurementCache`                                                 | —        | External measurement cache                                              |
| `overscan`           | `number \| { start?: number; end?: number }`                       | `3`      | Overscan on each side (number = symmetric)                              |
| `scrollEndDelay`     | `number`                                                           | `150`    | Debounce delay (ms) for scroll-end detection                            |
| `signal`             | `(init: GroupVirtualizerState<T>) => Signal<GroupVirtualizerState<T>>` | —   | Optional signal factory to expose state as a reactive Signal            |

### `GroupSection<T>`

```ts
interface GroupSection<T> {
  items: T[];
  label: string;
}
```

### `GroupVirtualizerState<T>`

```ts
interface GroupVirtualizerState<T> {
  readonly headers: GroupVirtualHeader[];
  readonly items: Array<GroupVirtualItem<T>>;
  readonly stickyHeader: GroupVirtualHeader | null;
  readonly totalSize: number;
}
```

`stickyHeader` is the header of the section currently at or above the viewport top, or `null` when at the very top. Render it as a floating overlay above the list.

### `GroupVirtualItem<T>` and `GroupVirtualHeader`

```ts
interface GroupVirtualItem<T> extends VirtualItem {
  data: T;
  itemIndex: number; // index within the section
  sectionIndex: number;
}

interface GroupVirtualHeader extends VirtualItem {
  label: string;
  sectionIndex: number;
}
```

### `GroupVirtualizer<T>` — methods

`GroupVirtualizer<T>` is an independent interface that exposes all core virtualizer methods directly, plus grouped-specific navigation.

| Method / Property                  | Description                                                              |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `update(sections, opts?)`           | Replace all sections with optional config overrides; see `GroupVirtualizerUpdateOptions<T>` |
| `scrollToSection(i, options?)`     | Scroll to section header at index `i`. Out-of-range is a no-op           |
| `scrollToItem(s, i, options?)`     | Scroll to item `i` in section `s`. Out-of-range is a no-op               |
| `scrollToIndex(i, options?)`       | Scroll to flat index `i` (from underlying virtualizer)                   |
| `scrollToOffset(offset, options?)` | Scroll to a raw pixel offset                                             |
| `scrollToTop(options?)`            | Scroll to offset `0`                                                     |
| `scrollToBottom(options?)`         | Scroll to the end of the list                                            |
| `measure(index, size)`             | Record a measurement for a flat index                                    |
| `measureBatch(entries)`            | Batch-record measurements for flat indices                               |
| `measureEl(index, el)`             | Attach auto-measuring ResizeObserver. Returns disconnect function        |
| `invalidate()`                     | Clear all measurements and rebuild                                       |
| `refresh()`                        | Rebuild offset table without clearing measurements                       |
| `count`                            | Total flat item count (live getter)                                      |
| `disposalSignal`                   | `AbortSignal` aborted on `dispose()`                                     |
| `isScrolling`                      | `true` while the user is scrolling; `false` once scroll settles          |
| `items`                            | Currently rendered group items (live getter)                             |
| `scrollOffset`                     | Current scroll position in pixels (live getter)                          |
| `stickyItems`                      | Sticky items pinned at viewport top (live getter)                        |
| `totalSize`                        | Total list size in pixels (live getter)                                  |
| `dispose()`                        | Teardown; idempotent                                                     |
| `disposed`                         | `true` after `dispose()` is called                                       |
| `[Symbol.dispose]()`               | Delegates to `dispose()`                                                 |

All scroll methods accept an optional `ScrollToIndexOptions` object (`{ align?, behavior?, onComplete? }`).

### `GroupVirtualizerUpdateOptions<T>`

Passed as the second argument to `groupVirtualizer.update()`. All fields are optional — omit any you don't want to change.

| Option               | Type                                                          | Description                                              |
| -------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| `estimateHeaderSize` | `number \| (section, sectionIndex) => number`                 | New header size estimate, applied on next rebuild        |
| `estimateItemSize`   | `number \| (item, itemIndex, sectionIndex) => number`         | New item size estimate, applied on next rebuild          |
| `getItemKey`         | `(item, itemIndex, sectionIndex) => VirtualKey`               | New item key function                                    |
| `measurementCache`   | `MeasurementCache`                                            | Hot-swap the measurement cache                           |
| `onChange`           | `(state: GroupVirtualizerState<T>) => void`                   | Replace the active onChange callback                     |
| `onScrollEnd`        | `(offset: number) => void`                                    | Replace the active onScrollEnd callback                  |
| `onScrollingChange`  | `(isScrolling: boolean) => void`                              | Replace the active onScrollingChange callback            |
| `overscan`           | `number \| { start?, end? }`                                  | New overscan count                                       |
| `scrollEndDelay`     | `number`                                                      | New debounce delay (ms) for scroll-end detection         |

> `horizontal` remains construction-only.

## `createGridVirtualizer(target, options)`

```ts
createGridVirtualizer(target: ScrollTarget, options: GridVirtualizerOptions): GridVirtualizer;
```

Two-dimensional virtualizer. Fires `onChange` with visible row and column descriptors. Callers form the cross-product `rows × cols` to render visible cells.

```ts
import { createGridVirtualizer } from '@vielzeug/scroll';

const grid = createGridVirtualizer(scrollEl, {
  rowCount: 10_000,
  colCount: 50,
  estimateRowSize: 36,
  estimateColSize: 120,
  onChange: ({ rows, cols, totalHeight, totalWidth }) => {
    containerEl.style.cssText = `position:relative;height:${totalHeight}px;width:${totalWidth}px;`;
    containerEl.replaceChildren();

    for (const row of rows) {
      for (const col of cols) {
        const cell = document.createElement('div');
        cell.style.cssText = `position:absolute;top:${row.start}px;left:${col.start}px;height:${row.size}px;width:${col.size}px;`;
        cell.textContent = `${row.index},${col.index}`;
        containerEl.appendChild(cell);
      }
    }
  },
});

grid.scrollToCell(500, 10, { rowAlign: 'center', colAlign: 'start' });
grid.dispose();
```

### `GridVirtualizerOptions`

| Option                | Type                                    | Default                | Description                            |
| --------------------- | --------------------------------------- | ---------------------- | -------------------------------------- |
| `rowCount`            | `number`                                | required               | Total row count                        |
| `colCount`            | `number`                                | required               | Total column count                     |
| `estimateRowSize`     | `number \| (row) => number`             | `36`                   | Row height estimate                    |
| `estimateColSize`     | `number \| (col) => number`             | `36`                   | Column width estimate                  |
| `rowGap`              | `number`                                | `0`                    | Gap between rows                       |
| `colGap`              | `number`                                | `0`                    | Gap between columns                    |
| `overscanY`           | `{ start?: number; end?: number }`      | `{ start: 3, end: 3 }` | Row overscan                           |
| `overscanX`           | `{ start?: number; end?: number }`      | `{ start: 3, end: 3 }` | Column overscan                        |
| `initialScrollTop`    | `number`                                | —                      | Initial vertical scroll position       |
| `initialScrollLeft`   | `number`                                | —                      | Initial horizontal scroll position     |
| `keyboardScroll`      | `boolean`                               | `false`                | Enable keyboard navigation (Arrow/Page/Home/End keys) |
| `onChange`            | `(state: GridVirtualizerState) => void` | —                      | Called when the visible window changes |
| `onRangeChange`       | `(range: GridRangeChangeEvent) => void` | —                      | Zero-allocation range callback         |
| `rowMeasurementCache` | `Map<number, number>`                   | —                      | External row measurement cache         |
| `colMeasurementCache` | `Map<number, number>`                   | —                      | External column measurement cache      |
| `signal`              | `(init: GridVirtualizerState) => Signal<GridVirtualizerState>` | —    | Optional signal factory to expose state as a reactive Signal |

### `GridVirtualizerState`

```ts
interface GridVirtualizerState {
  readonly cols: VirtualItem[];
  readonly rows: VirtualItem[];
  readonly totalHeight: number;
  readonly totalWidth: number;
}
```

### `GridVirtualizer` — properties and methods

**Read-only properties:** `rows`, `cols`, `scrollTop`, `scrollLeft`, `totalHeight`, `totalWidth`, `disposalSignal`, `disposed`

| Method                             | Description                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `update(next)`                     | Atomically update row/col counts, estimates, gaps, and overscan                   |
| `measureRow(row, size)`            | Record a row height                                                               |
| `measureColumn(col, size)`         | Record a column width                                                             |
| `measureBatch(rows, cols)`         | Measure rows and columns in a single coordinated rebuild pass                     |
| `measureRowEl(row, el)`            | Auto-measure row height via ResizeObserver. Returns disconnect fn                 |
| `measureColEl(col, el)`            | Auto-measure column width via ResizeObserver. Returns disconnect fn               |
| `refresh()`                        | Rebuild offset tables from current measurements                                   |
| `invalidate()`                     | Clear all measurements and rebuild from estimates                                 |
| `scrollToCell(row, col, options?)` | Scroll to bring a cell into view; no-op when `rowCount === 0` or `colCount === 0` |
| `scrollToRow(row, options?)`       | Scroll to bring a row into view; `rowAlign` controls alignment                    |
| `scrollToColumn(col, options?)`    | Scroll to bring a column into view; `colAlign` controls alignment                 |
| `prependRows(n)`                   | Add `n` rows at the top; adjusts scroll offset to keep viewport stable            |
| `dispose()`                        | Teardown; idempotent                                                              |
| `[Symbol.dispose]()`               | Delegates to `dispose()`                                                          |

`measureRowEl`/`measureColEl`'s `ResizeObserver` is also disconnected automatically on `dispose()` —
the returned disconnect function is only needed to stop observing a specific element early.

### `ScrollToCellOptions`

```ts
interface ScrollToCellOptions {
  behavior?: ScrollBehavior;
  colAlign?: 'auto' | 'center' | 'end' | 'start';
  rowAlign?: 'auto' | 'center' | 'end' | 'start';
}
```

## Types

### `VirtualItem`

```ts
interface VirtualItem {
  end: number;
  index: number;
  size: number;
  start: number;
}
```

### `VirtualizerState`

```ts
interface VirtualizerState {
  readonly items: VirtualItem[];
  readonly stickyItems: VirtualItem[];
  readonly totalSize: number;
}
```

### `ScrollToIndexOptions`

```ts
interface ScrollToIndexOptions {
  align?: 'auto' | 'center' | 'end' | 'start';
  behavior?: ScrollBehavior;
  /** Called when the scroll animation completes (instant scrolls: next microtask). */
  onComplete?: () => void;
}
```

### `Overscan`

```ts
type Overscan = number | { end?: number; start?: number };
```

Passing a number is shorthand for symmetric overscan on both sides.

### `VirtualKey`

```ts
type VirtualKey = number | string;
```

### `VirtualRenderItem<T>`

```ts
type VirtualRenderItem<T> = VirtualItem & { readonly data: T };
```

### `ScrollTarget`

```ts
type ScrollTarget = HTMLElement | Window;
```

### `MeasurementCache`

```ts
type MeasurementCache = Map<VirtualKey, number>;
```

Use `createMeasurementCache()` to create an empty cache:

```ts
import { createMeasurementCache } from '@vielzeug/scroll';

const cache = createMeasurementCache();
const virt1 = createVirtualizer(el1, { count: 100, measurementCache: cache });
const virt2 = createVirtualizer(el2, { count: 100, measurementCache: cache });
```

### `RecycleFn`

```ts
type RecycleFn = (key: VirtualKey, create: () => HTMLElement) => HTMLElement;
```

### `VirtualizerUpdateOptions`

```ts
interface VirtualizerUpdateOptions {
  autoMeasure?: boolean;
  count?: number;
  estimateSize?: number | ((index: number) => number);
  gap?: number;
  getItemKey?: ((index: number) => VirtualKey) | undefined;
  keyboardScroll?: boolean;
  /** Replace the active measurement cache. Existing entries are used immediately on the next rebuild. */
  measurementCache?: MeasurementCache;
  onChange?: ((state: VirtualizerState) => void) | undefined;
  onScrollEnd?: ((offset: number) => void) | undefined;
  onScrollingChange?: ((isScrolling: boolean) => void) | undefined;
  overscan?: Overscan;
  scrollEndDelay?: number;
  sticky?: ((index: number) => boolean) | undefined;
}
```

### `VirtualScrollerOptions<T>`

`DomVirtualListOptions<T>` minus `listElement` and `scrollElement`, plus:

```ts
type VirtualScrollerOptions<T> = Omit<DomVirtualListOptions<T>, 'listElement' | 'scrollElement'> & {
  /** CSS class applied to the generated scroll container element. */
  containerClass?: string;
};
```

### `GridVirtualizerUpdateOptions`

```ts
interface GridVirtualizerUpdateOptions {
  colCount?: number;
  colGap?: number;
  estimateColSize?: number | ((col: number) => number);
  estimateRowSize?: number | ((row: number) => number);
  keyboardScroll?: boolean;
  onChange?: ((state: GridVirtualizerState) => void) | undefined;
  onRangeChange?: ((range: GridRangeChangeEvent) => void) | undefined;
  overscanX?: Overscan;
  overscanY?: Overscan;
  rowCount?: number;
  rowGap?: number;
}
```

### `GridRangeChangeEvent`

Fired by `onRangeChange` on `createGridVirtualizer`. Zero-allocation alternative to `onChange` — no `rows`/`cols` arrays are allocated.

```ts
interface GridRangeChangeEvent {
  firstCol: number;
  firstRow: number;
  lastCol: number;
  lastRow: number;
}
```

### `VirtualizerOptions`

```ts
interface VirtualizerOptions {
  autoMeasure?: boolean;
  count: number;
  estimateSize?: number | ((index: number) => number);
  gap?: number;
  getItemKey?: (index: number) => VirtualKey;
  horizontal?: boolean;
  initialOffset?: number;
  keyboardScroll?: boolean;
  measurementCache?: MeasurementCache;
  onChange?: (state: VirtualizerState) => void;
  onScrollEnd?: (offset: number) => void;
  onScrollingChange?: (isScrolling: boolean) => void;
  overscan?: Overscan;
  scrollEndDelay?: number;
  signal?: (init: VirtualizerState) => Signal<VirtualizerState>;
  sticky?: (index: number) => boolean;
}
```

### `Virtualizer`

```ts
interface Virtualizer {
  readonly count: number;
  readonly disposalSignal: AbortSignal;
  dispose: () => void;
  readonly disposed: boolean;
  invalidate: () => void;
  isAtEnd: (threshold?: number) => boolean;
  readonly isScrolling: boolean;
  readonly items: VirtualItem[];
  measure: (index: number, size: number) => void;
  measureBatch: (entries: Array<{ index: number; size: number }>) => void;
  measureEl: (index: number, el: HTMLElement) => () => void;
  prepend: (additionalCount: number) => void;
  refresh: () => void;
  readonly scrollOffset: number;
  scrollToBottom: (options?: { behavior?: ScrollBehavior }) => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  scrollToOffset: (offset: number, options?: { behavior?: ScrollBehavior }) => void;
  scrollToTop: (options?: { behavior?: ScrollBehavior }) => void;
  readonly stickyItems: VirtualItem[];
  readonly totalSize: number;
  update: (next: VirtualizerUpdateOptions) => void;
  [Symbol.dispose]: () => void;
}
```

### `StickToBottomOptions`

```ts
type StickToBottomOptions = {
  enabled?: boolean;
  threshold?: number;
};
```

### `DomVirtualListOptions<T>`

```ts
type DomVirtualListOptions<T> = {
  clear?: (listEl: HTMLElement) => void;
  estimateSize?: number | ((index: number, item: T) => number);
  gap?: number;
  getItemKey?: (index: number, item: T) => VirtualKey;
  horizontal?: boolean;
  keyboardScroll?: boolean;
  listElement: HTMLElement;
  measurementCache?: MeasurementCache;
  overscan?: Overscan;
  render: (args: DomVirtualListRenderArgs<T>) => void;
  scrollElement: HTMLElement | Window;
  stickToBottom?: boolean | StickToBottomOptions;
  sticky?: (index: number, item: T) => boolean;
  signal?: (init: VirtualizerState) => Signal<VirtualizerState>;
};
```

### `DomVirtualListController<T>`

`Virtualizer` minus `prepend` and `update`, plus `setItems()`.

```ts
type DomVirtualListController<T> = Omit<Virtualizer, 'prepend' | 'update'> & {
  setItems: (items: T[]) => void;
};
```

### `DomVirtualListRenderArgs<T>`

```ts
type DomVirtualListRenderArgs<T> = {
  items: Array<VirtualRenderItem<T>>;
  listEl: HTMLElement;
  recycle: RecycleFn;
  stickyItems: Array<VirtualRenderItem<T>>;
  totalSize: number;
};
```

### `GroupSection<T>`

```ts
interface GroupSection<T> {
  items: T[];
  label: string;
}
```

### `GroupVirtualizerState<T>`

```ts
interface GroupVirtualizerState<T> {
  readonly headers: GroupVirtualHeader[];
  readonly items: Array<GroupVirtualItem<T>>;
  readonly stickyHeader: GroupVirtualHeader | null;
  readonly totalSize: number;
}
```

### `GroupVirtualItem<T>`

```ts
interface GroupVirtualItem<T> extends VirtualItem {
  data: T;
  itemIndex: number;
  sectionIndex: number;
}
```

### `GroupVirtualHeader`

```ts
interface GroupVirtualHeader extends VirtualItem {
  label: string;
  sectionIndex: number;
}
```

### `GroupVirtualizerOptions<T>`

```ts
interface GroupVirtualizerOptions<T> {
  estimateHeaderSize?: number | ((section: GroupSection<T>, sectionIndex: number) => number);
  estimateItemSize?: number | ((item: T, itemIndex: number, sectionIndex: number) => number);
  getItemKey?: (item: T, itemIndex: number, sectionIndex: number) => VirtualKey;
  horizontal?: boolean;
  measurementCache?: MeasurementCache;
  onChange?: (state: GroupVirtualizerState<T>) => void;
  onScrollEnd?: (offset: number) => void;
  onScrollingChange?: (isScrolling: boolean) => void;
  overscan?: Overscan;
  scrollEndDelay?: number;
  sections: Array<GroupSection<T>>;
  signal?: (init: GroupVirtualizerState<T>) => Signal<GroupVirtualizerState<T>>;
}
```

### `GroupVirtualizerUpdateOptions<T>`

```ts
interface GroupVirtualizerUpdateOptions<T> {
  estimateHeaderSize?: number | ((section: GroupSection<T>, sectionIndex: number) => number);
  estimateItemSize?: number | ((item: T, itemIndex: number, sectionIndex: number) => number);
  getItemKey?: (item: T, itemIndex: number, sectionIndex: number) => VirtualKey;
  measurementCache?: MeasurementCache;
  onChange?: ((state: GroupVirtualizerState<T>) => void) | undefined;
  onScrollEnd?: ((offset: number) => void) | undefined;
  onScrollingChange?: ((isScrolling: boolean) => void) | undefined;
  overscan?: Overscan;
  scrollEndDelay?: number;
}
```

### `GroupVirtualizer<T>`

```ts
interface GroupVirtualizer<T> {
  readonly count: number;
  readonly disposalSignal: AbortSignal;
  dispose: () => void;
  readonly disposed: boolean;
  invalidate: () => void;
  readonly isScrolling: boolean;
  readonly items: ReadonlyArray<GroupVirtualItem<T>>;
  measure: (index: number, size: number) => void;
  measureBatch: (entries: Array<{ index: number; size: number }>) => void;
  measureEl: (index: number, el: HTMLElement) => () => void;
  refresh: () => void;
  readonly scrollOffset: number;
  scrollToBottom: (options?: { behavior?: ScrollBehavior }) => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  scrollToItem: (sectionIndex: number, itemIndex: number, options?: ScrollToIndexOptions) => void;
  scrollToOffset: (offset: number, options?: { behavior?: ScrollBehavior }) => void;
  scrollToSection: (sectionIndex: number, options?: ScrollToIndexOptions) => void;
  scrollToTop: (options?: { behavior?: ScrollBehavior }) => void;
  readonly stickyItems: VirtualItem[];
  readonly totalSize: number;
  update: (sections: Array<GroupSection<T>>, opts?: GroupVirtualizerUpdateOptions<T>) => void;
  [Symbol.dispose]: () => void;
}
```

### `GridVirtualizerState`

```ts
interface GridVirtualizerState {
  readonly cols: VirtualItem[];
  readonly rows: VirtualItem[];
  readonly totalHeight: number;
  readonly totalWidth: number;
}
```

### `ScrollToCellOptions`

```ts
interface ScrollToCellOptions {
  behavior?: ScrollBehavior;
  colAlign?: 'auto' | 'center' | 'end' | 'start';
  rowAlign?: 'auto' | 'center' | 'end' | 'start';
}
```

### `GridVirtualizerOptions`

```ts
interface GridVirtualizerOptions {
  colCount: number;
  colGap?: number;
  colMeasurementCache?: Map<number, number>;
  estimateColSize?: number | ((col: number) => number);
  estimateRowSize?: number | ((row: number) => number);
  initialScrollLeft?: number;
  initialScrollTop?: number;
  keyboardScroll?: boolean;
  onChange?: (state: GridVirtualizerState) => void;
  onRangeChange?: (range: GridRangeChangeEvent) => void;
  overscanX?: Overscan;
  overscanY?: Overscan;
  rowCount: number;
  rowGap?: number;
  rowMeasurementCache?: Map<number, number>;
  signal?: (init: GridVirtualizerState) => Signal<GridVirtualizerState>;
}
```

### `GridVirtualizer`

```ts
interface GridVirtualizer {
  readonly cols: VirtualItem[];
  readonly disposalSignal: AbortSignal;
  dispose: () => void;
  readonly disposed: boolean;
  invalidate: () => void;
  measureBatch: (rows: Array<{ index: number; size: number }>, cols: Array<{ index: number; size: number }>) => void;
  measureColEl: (col: number, el: HTMLElement) => () => void;
  measureColumn: (col: number, size: number) => void;
  measureRow: (row: number, size: number) => void;
  measureRowEl: (row: number, el: HTMLElement) => () => void;
  prependRows: (additionalRowCount: number) => void;
  refresh: () => void;
  readonly rows: VirtualItem[];
  readonly scrollLeft: number;
  scrollToCell: (row: number, col: number, options?: ScrollToCellOptions) => void;
  scrollToColumn: (col: number, options?: Pick<ScrollToCellOptions, 'behavior' | 'colAlign'>) => void;
  readonly scrollTop: number;
  scrollToRow: (row: number, options?: Pick<ScrollToCellOptions, 'behavior' | 'rowAlign'>) => void;
  readonly totalHeight: number;
  readonly totalWidth: number;
  update: (next: GridVirtualizerUpdateOptions) => void;
  [Symbol.dispose]: () => void;
}
```

## Errors

| Class | Thrown when | Notable properties |
| --- | --- | --- |
| `ScrollError` | Base class for every Scroll error. | `ScrollError.is(error)` narrows errors from this package. |
| `ScrollConfigurationError` | A constructor or `update()` receives invalid static configuration. | Extends `ScrollError`; malformed JavaScript values also use this class. |
| `ScrollRangeError` | A DOM virtual-list render detects that a caller mutated its items array without calling `setItems()` again. | Extends `ScrollError`; message includes stale index and current item count. |

Runtime estimator failures, stale measurements, and out-of-range navigation remain resilient: they fall back, no-op, or clamp as documented.

### Constants

```ts
const DEFAULT_ESTIMATE_SIZE = 36; // default estimateSize
const DEFAULT_OVERSCAN = 3; // default overscan on each side
```
