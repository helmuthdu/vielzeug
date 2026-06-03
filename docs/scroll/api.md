---
title: Scroll — API Reference
description: Complete API reference for the Scroll virtual list engine.
---

[[toc]]

## API At a Glance

| Symbol                        | Purpose                                       | Returns                       |
| ----------------------------- | --------------------------------------------- | ----------------------------- |
| `createVirtualizer()`         | Core 1D virtualizer                           | `Virtualizer`                 |
| `createDomVirtualList()`      | DOM adapter for dropdown/listbox UIs          | `DomVirtualListController<T>` |
| `createVirtualScroller()`     | Self-contained scroller (creates its own DOM) | `DomVirtualListController<T>` |
| `createGroupedVirtualizer()`  | Sectioned list with sticky headers            | `GroupVirtualizer<T>`         |
| `createGridVirtualizer()`     | Two-dimensional grid virtualizer              | `GridVirtualizer`             |
| `createReactiveVirtualizer()` | Virtualizer with reactive signal output       | `ReactiveVirtualizer`         |

## Package Entry Point

Everything exports from a single entry:

```ts
import {
  createVirtualizer,
  createDomVirtualList,
  createVirtualScroller,
  createGroupedVirtualizer,
  createGridVirtualizer,
  createReactiveVirtualizer,
  type Virtualizer,
  type VirtualItem,
  type VirtualizerState,
} from '@vielzeug/scroll';
```

## `createVirtualizer(target, options)`

```ts
createVirtualizer(target: ScrollTarget, options: VirtualizerOptions): Virtualizer;
```

Creates and immediately attaches a virtualizer to the provided scroll container. `onChange` fires synchronously on construction with the initial visible window. Call `destroy()` on unmount.

```ts
import { createVirtualizer } from '@vielzeug/scroll';

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 36,
  gap: 8,
  onChange: ({ items, totalSize }) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

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

| Option             | Type                                         | Default          | Description                                                                                                              |
| ------------------ | -------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `count`            | `number`                                     | required         | Total item count                                                                                                         |
| `estimateSize`     | `number \| (index: number) => number`        | `36`             | Fixed size or per-index estimate in pixels                                                                               |
| `gap`              | `number`                                     | `0`              | Gap between adjacent items in pixels                                                                                     |
| `getItemKey`       | `(index: number) => string \| number`        | `index => index` | Stable key for the measurement cache                                                                                     |
| `horizontal`       | `boolean`                                    | `false`          | Virtualize along the X axis instead of Y                                                                                 |
| `initialOffset`    | `number`                                     | —                | Initial scroll position; applied once on construction                                                                    |
| `measurementCache` | `MeasurementCache`                           | —                | Shared external cache for scroll restoration or SSR pre-measurement                                                      |
| `onChange`         | `(state: VirtualizerState) => void`          | —                | Called when the visible window changes                                                                                   |
| `onRangeChange`    | `(first: number, last: number) => void`      | —                | Zero-allocation alternative: fires with first/last indices only. When used **without** `onChange`, `v.items` stays empty |
| `overscan`         | `number \| { start?: number; end?: number }` | `3`              | Extra items outside the viewport; number = symmetric on both sides                                                       |
| `sticky`           | `(index: number) => boolean`                 | —                | Mark an item as a sticky header (pinned at viewport top)                                                                 |

`onChange` and `onRangeChange` are fixed at construction — they cannot be changed via `update()`.

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

| Property       | Type            | Description                                                             |
| -------------- | --------------- | ----------------------------------------------------------------------- |
| `count`        | `number`        | Current item count                                                      |
| `items`        | `VirtualItem[]` | Currently rendered items. Empty when only `onRangeChange` is registered |
| `scrollOffset` | `number`        | Current scroll position in pixels                                       |
| `stickyItems`  | `VirtualItem[]` | Items pinned at the viewport top (requires `sticky` option)             |
| `totalSize`    | `number`        | Total height (or width in horizontal mode)                              |

### `Virtualizer` — methods

| Method             | Signature                                                           | Description                                                          |
| ------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `update`           | `(next: VirtualizerUpdateOptions) => void`                          | Atomically update live options                                       |
| `measure`          | `(index: number, size: number) => void`                             | Record one measured size; rebuild batched in microtask               |
| `measureBatch`     | `(entries: Array<{ index: number; size: number }>) => void`         | Record many sizes; single rebuild                                    |
| `measureEl`        | `(index: number, el: HTMLElement) => () => void`                    | Attach ResizeObserver to auto-measure. Returns a disconnect function |
| `redraw`           | `() => void`                                                        | Re-emit the current window without rebuilding offsets (O(1))         |
| `refresh`          | `() => void`                                                        | Rebuild offset table from current estimates/measurements             |
| `prepend`          | `(additionalCount: number) => void`                                 | Add items at the top; adjusts scroll offset to keep viewport stable  |
| `scrollToIndex`    | `(index: number, options?: ScrollToIndexOptions) => void`           | Scroll to an item; out-of-range indices are clamped                  |
| `scrollToOffset`   | `(offset: number, options?: { behavior?: ScrollBehavior }) => void` | Scroll to a raw pixel offset                                         |
| `scrollToTop`      | `(options?: { behavior?: ScrollBehavior }) => void`                 | Scroll to offset `0`                                                 |
| `scrollToBottom`   | `(options?: { behavior?: ScrollBehavior }) => void`                 | Scroll to the end of the list                                        |
| `invalidate`       | `() => void`                                                        | Clear all measurements and rebuild from estimates                    |
| `destroy`          | `() => void`                                                        | Detach listeners; idempotent                                         |
| `[Symbol.dispose]` | `() => void`                                                        | Delegates to `destroy()` — enables `using` declarations              |

### `update(next)`

Atomically updates one or more live options. Accepts: `count`, `estimateSize`, `gap`, `getItemKey`, `overscan`, `sticky`. Creation-time options (`horizontal`, `initialOffset`, `onChange`, `onRangeChange`, `measurementCache`) cannot be changed after construction.

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

Attaches a `ResizeObserver` to auto-measure `el` on resize. Returns a disconnect function.

```ts
const disconnect = virt.measureEl(item.index, rowEl);
// later: disconnect();
```

### `redraw()`

Re-emits the current visible range without rebuilding the offset table (O(1) vs `refresh`'s O(n)). Use when item data changed but sizes did not.

### `refresh()`

Rebuilds the full offset table and re-emits. Preserves cached measurements. Use after reordering or filtering a stable-key list.

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

### `destroy()` and `[Symbol.dispose]()`

`destroy()` detaches observers and event listeners. It is idempotent.

```ts
{
  using virt = createVirtualizer(scrollEl, { count: rows.length, onChange: render });
} // → destroy() called automatically
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
ctrl.destroy();
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
| `measurementCache` | `MeasurementCache`                            | —        | External measurement cache                                 |
| `overscan`         | `number \| { start?: number; end?: number }`  | `3`      | Extra items outside the viewport; number = symmetric       |
| `clear`            | `(listEl: HTMLElement) => void`               | —        | Custom teardown for listEl; defaults to `textContent = ''` |

Without `getItemKey`, each `setItems()` call drops cached measurements.

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
| `items`            | Currently rendered virtual items (live getter)                                              |
| `totalSize`        | Total list size in pixels (live getter)                                                     |
| `scrollOffset`     | Current scroll position (live getter)                                                       |
| `stickyItems`      | Sticky items pinned at viewport top (live getter)                                           |
| `measure`          | Delegate to underlying virtualizer; no-op before first `setItems`                           |
| `measureBatch`     | Batch measurement delegate                                                                  |
| `measureEl`        | Attach auto-measuring ResizeObserver                                                        |
| `redraw`           | Re-emit without rebuilding offsets                                                          |
| `refresh`          | Rebuild offset table                                                                        |
| `invalidate`       | Clear measurements and rebuild from estimates                                               |
| `scrollToIndex`    | Scroll to an item                                                                           |
| `scrollToOffset`   | Scroll to a pixel offset                                                                    |
| `destroy`          | Teardown; idempotent                                                                        |
| `[Symbol.dispose]` | Delegates to `destroy()`                                                                    |

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
list.destroy(); // also removes the generated scroll container
```

`VirtualScrollerOptions<T>` is `DomVirtualListOptions<T>` minus `listElement`/`scrollElement`, plus:

| Option           | Type     | Description                                       |
| ---------------- | -------- | ------------------------------------------------- |
| `containerClass` | `string` | CSS class applied to the generated scroll element |

`destroy()` removes the generated scroll container from the DOM.

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
    listEl.innerHTML = '';

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
virt.destroy();
```

### `GroupVirtualizerOptions<T>`

| Option               | Type                                                               | Default  | Description                                |
| -------------------- | ------------------------------------------------------------------ | -------- | ------------------------------------------ |
| `sections`           | `Array<GroupSection<T>>`                                           | required | Initial sections                           |
| `onChange`           | `(state: GroupVirtualizerState<T>) => void`                        | —        | Called when the visible window changes     |
| `estimateHeaderSize` | `number \| (section, sectionIndex) => number`                      | `36`     | Header height estimate                     |
| `estimateItemSize`   | `number \| (item, itemIndex, sectionIndex) => number`              | `36`     | Item height estimate                       |
| `getItemKey`         | `(item: T, itemIndex: number, sectionIndex: number) => VirtualKey` | —        | Stable key for measurement cache           |
| `horizontal`         | `boolean`                                                          | `false`  | Virtualize along X axis                    |
| `measurementCache`   | `MeasurementCache`                                                 | —        | External measurement cache                 |
| `overscan`           | `number \| { start?: number; end?: number }`                       | `3`      | Overscan on each side (number = symmetric) |

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

`GroupVirtualizer<T>` extends `Virtualizer` (minus `prepend` and `update`), so all core methods are available directly.

| Method                         | Description                                                          |
| ------------------------------ | -------------------------------------------------------------------- |
| `update(sections)`             | Replace sections; rebuilds flat index, preserves cached measurements |
| `scrollToSection(i, options?)` | Scroll to section header at index `i`. Out-of-range is a no-op       |
| `scrollToItem(s, i, options?)` | Scroll to item `i` in section `s`. Out-of-range is a no-op           |
| `scrollToIndex(i, options?)`   | Scroll to flat index `i` (from underlying virtualizer)               |
| `scrollToTop(options?)`        | Scroll to offset `0`                                                 |
| `scrollToBottom(options?)`     | Scroll to the end of the list                                        |
| `measure(index, size)`         | Record a measurement for a flat index                                |
| `invalidate()`                 | Clear all measurements and rebuild                                   |
| `refresh()`                    | Rebuild offset table without clearing measurements                   |
| `destroy()`                    | Teardown; idempotent                                                 |
| `[Symbol.dispose]()`           | Delegates to `destroy()`                                             |

All scroll methods accept an optional `ScrollToIndexOptions` object (`{ align?, behavior?, onComplete? }`).

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
    containerEl.innerHTML = '';

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
grid.destroy();
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
| `onChange`            | `(state: GridVirtualizerState) => void` | —                      | Called when the visible window changes |
| `onRangeChange`       | `(range: GridRangeChangeEvent) => void` | —                      | Zero-allocation range callback         |
| `rowMeasurementCache` | `Map<number, number>`                   | —                      | External row measurement cache         |
| `colMeasurementCache` | `Map<number, number>`                   | —                      | External column measurement cache      |

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

**Read-only properties:** `rows`, `cols`, `scrollTop`, `scrollLeft`, `totalHeight`, `totalWidth`

| Method                             | Description                                                            |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `update(next)`                     | Atomically update row/col counts, estimates, gaps, and overscan        |
| `measureRow(row, size)`            | Record a row height                                                    |
| `measureColumn(col, size)`         | Record a column width                                                  |
| `measureBatch(rows, cols)`         | Measure rows and columns in a single coordinated rebuild pass          |
| `measureRowEl(row, el)`            | Auto-measure row height via ResizeObserver. Returns disconnect fn      |
| `measureColEl(col, el)`            | Auto-measure column width via ResizeObserver. Returns disconnect fn    |
| `refresh()`                        | Rebuild offset tables from current measurements                        |
| `invalidate()`                     | Clear all measurements and rebuild from estimates                      |
| `scrollToCell(row, col, options?)` | Scroll to bring a cell into view                                       |
| `prependRows(n)`                   | Add `n` rows at the top; adjusts scroll offset to keep viewport stable |
| `destroy()`                        | Teardown; idempotent                                                   |
| `[Symbol.dispose]()`               | Delegates to `destroy()`                                               |

### `ScrollToCellOptions`

```ts
interface ScrollToCellOptions {
  behavior?: ScrollBehavior;
  colAlign?: 'auto' | 'center' | 'end' | 'start';
  rowAlign?: 'auto' | 'center' | 'end' | 'start';
}
```

## `createReactiveVirtualizer(target, options)`

```ts
createReactiveVirtualizer(
  target: ScrollTarget,
  options: Omit<VirtualizerOptions, 'onChange'>,
): ReactiveVirtualizer;
```

Wraps `createVirtualizer` and exposes state as a `Signal<VirtualizerState>` from `@vielzeug/ripple`. All `Virtualizer` methods and live getters are available on the returned object. `onChange` must not be provided — it is wired internally.

```ts
import { createReactiveVirtualizer } from '@vielzeug/scroll';
import { effect } from '@vielzeug/ripple';

const virt = createReactiveVirtualizer(scrollEl, {
  count: 1000,
  estimateSize: 40,
});

effect(() => {
  const { items, totalSize } = virt.state.value;
  listEl.style.height = `${totalSize}px`;
  listEl.innerHTML = '';
  for (const item of items) {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;top:${item.start}px;height:${item.size}px;`;
    listEl.appendChild(el);
  }
});

virt.update({ count: 2000 });
virt.destroy();
```

### `ReactiveVirtualizer`

```ts
interface ReactiveVirtualizer extends Virtualizer {
  readonly state: Signal<VirtualizerState>;
}
```

The `state` signal is updated synchronously whenever the visible window changes. All live getters (`count`, `items`, `totalSize`, `scrollOffset`, `stickyItems`) remain current — the implementation uses a `Proxy` rather than a snapshot.

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
type Overscan = { end?: number; start?: number };
```

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

Explicit interface for `update()`. Accepts: `count`, `estimateSize`, `gap`, `getItemKey`, `overscan`, `sticky`.

### Constants

```ts
const DEFAULT_ESTIMATE_SIZE = 36; // default estimateSize
const DEFAULT_OVERSCAN = 3; // default overscan on each side
```
