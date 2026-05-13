---
title: Virtualit — API Reference
description: Complete API reference for the Virtualit virtual list engine.
---

[[toc]]

## Package Entry Point

| Import                  | Purpose                |
| ----------------------- | ---------------------- |
| `@vielzeug/virtualit`   | Main exports and types |

## API At a Glance

| Symbol                   | Purpose                                    | Execution mode         | Common gotcha                                                      |
| ------------------------ | ------------------------------------------ | ---------------------- | ------------------------------------------------------------------ |
| `createVirtualizer()`    | Create an attached virtual list controller | Sync                   | It attaches immediately                                            |
| `virtualizer.update()`   | Atomically update live options             | Sync                   | Use this for `count`, `estimateSize`, `gap`, `overscan`, callbacks |
| `virtualizer.measure()`  | Record measured item size                  | Sync (batched rebuild) | Measurements are applied after microtask flush                     |
| `virtualizer.refresh()`  | Rebuild layout with current measurements   | Sync                   | Use after stable-key reorder/filter changes                        |
| `createDomVirtualList()` | DOM-first wrapper for dropdown/listbox UIs | Sync                   | Keep `setItems()` and `setActive()` in sync with UI state          |

## Package Exports

```ts
export { createVirtualizer } from '@vielzeug/virtualit';
export type {
  Overscan,
  ScrollToIndexOptions,
  VirtualKey,
  VirtualItem,
  Virtualizer,
  VirtualizerOptions,
  VirtualizerUpdateOptions,
} from '@vielzeug/virtualit';

export { createDomVirtualList } from '@vielzeug/virtualit/dom';
export type {
  DomVirtualListController,
  DomVirtualListOptions,
  DomVirtualListRenderArgs,
} from '@vielzeug/virtualit/dom';
```

## Core API

### `createVirtualizer(target, options)`

Creates and immediately attaches a virtualizer to the provided scroll container.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 36,
  gap: 8,
  overscan: { start: 4, end: 4 },
  onChange: (items, totalSize) => {
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

#### Parameters

| Parameter | Type                    | Description              |
| --------- | ----------------------- | ------------------------ |
| `target`  | `HTMLElement \| Window` | Scroll target to observe |
| `options` | `VirtualizerOptions`    | Initial options          |

#### `VirtualizerOptions`

| Option              | Type                                                | Default                | Description                               |
| ------------------- | --------------------------------------------------- | ---------------------- | ----------------------------------------- |
| `count`             | `number`                                            | required               | Total item count                          |
| `estimateSize`      | `number \| (index: number) => number`               | `36`                   | Fixed size or per-index estimate          |
| `gap`               | `number`                                            | `0`                    | Pixel gap inserted between adjacent items |
| `getItemKey`        | `(index: number) => string \| number`               | `index => index`       | Stable key mapping for measurement cache  |
| `horizontal`        | `boolean`                                           | `false`                | Use X axis instead of Y axis              |
| `initialOffset`     | `number`                                            | `undefined`            | Initial scroll position set on attach     |
| `overscan`          | `{ start?: number; end?: number }`                  | `{ start: 3, end: 3 }` | Asymmetric overscan configuration         |
| `onChange`          | `(items: VirtualItem[], totalSize: number) => void` | `undefined`            | Called when render window changes         |
| `onScrollingChange` | `(isScrolling: boolean) => void`                    | `undefined`            | Called on scroll state transitions        |
| `onScrollEnd`       | `(offset: number) => void`                          | `undefined`            | Called after debounced scroll end         |
| `scrollEndDelay`    | `number`                                            | `120`                  | Debounce delay for scroll-end detection   |

## `Virtualizer` Interface

```ts
interface Virtualizer {
  readonly count: number;
  readonly isScrolling: boolean;
  readonly items: VirtualItem[];
  readonly scrollOffset: number;
  readonly totalSize: number;

  update(next: VirtualizerUpdateOptions): void;
  measure(index: number, size: number): void;
  refresh(): void;
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void;
  scrollToOffset(offset: number, options?: { behavior?: ScrollBehavior }): void;
  invalidate(): void;
  destroy(): void;
  [Symbol.dispose](): void;
}
```

### `items` and `totalSize`

- `items`: currently rendered window descriptors
- `totalSize`: total height of the full list in pixels

```ts
for (const item of virt.items) {
  // render each item
}
spacerEl.style.height = `${virt.totalSize}px`;
```

### `update(next)`

Atomically updates one or more options.

```ts
virt.update({ count: rows.length });
virt.update({ estimateSize: 40 });
virt.update({ overscan: { start: 5, end: 5 } });
virt.update({ onChange: render });
virt.update({ count: 5_000, estimateSize: 32, overscan: { start: 2, end: 2 } });
```

`update()` accepts live runtime options only. `initialOffset` and `horizontal` are creation-time options.

### `measure(index, size)`

Records measured height for variable-size rows. Rebuilds are batched in a microtask.

```ts
for (const item of virt.items) {
  const el = listEl.querySelector<HTMLElement>(`[data-index="${item.index}"]`);
  if (el) virt.measure(item.index, el.offsetHeight);
}
```

### `refresh()`

Rebuilds offsets and recomputes the visible window while keeping measured sizes.

Use this after the index-to-item mapping changes but logical row identity stays stable, such as reordering or filtering a list with `getItemKey`.

```ts
virt.refresh();
```

### `scrollToIndex(index, options?)`

Scrolls to an item index. Out-of-range indices are clamped.

For variable-size lists, the target offset is computed from the current estimate plus any measured rows already in cache. If item heights changed, call `invalidate()` before relying on the exact final offset.

```ts
virt.scrollToIndex(0, { align: 'start' });
virt.scrollToIndex(120, { align: 'center', behavior: 'smooth' });
virt.scrollToIndex(focusedIndex, { align: 'auto' });
```

### `scrollToOffset(offset, options?)`

Scrolls to a raw pixel offset.

```ts
virt.scrollToOffset(savedOffset);
```

### `invalidate()`

Clears measured sizes and rebuilds using estimator values.

```ts
document.fonts.ready.then(() => virt.invalidate());
```

### `destroy()` and `[Symbol.dispose]()`

- `destroy()` detaches observers/listeners and is idempotent.
- `[Symbol.dispose]()` delegates to `destroy()`.

```ts
{
  using virt = createVirtualizer(scrollEl, { count: rows.length, onChange: render });
}
```

## DOM Module (`@vielzeug/virtualit/dom`)

### `createDomVirtualList(options)`

Creates a DOM-focused virtual list controller around the core virtualizer.

```ts
import { createDomVirtualList } from '@vielzeug/virtualit/dom';

const domList = createDomVirtualList<Row>({
  estimateSize: 36,
  getListElement: () => listEl,
  getScrollElement: () => dropdownEl,
  render: ({ items, listEl, totalSize, virtualItems }) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    for (const item of virtualItems) {
      const row = document.createElement('div');
      row.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.start}px);`;
      row.textContent = items[item.index]?.label ?? '';
      listEl.appendChild(row);
    }
  },
});

// Typical lifecycle sync
domList.setItems(rows);
domList.setActive(isOpen);
```

### `DomVirtualListOptions<T>`

```ts
interface DomVirtualListOptions<T> {
  clear?: (listEl: HTMLElement) => void;
  estimateSize: number | ((index: number, item: T) => number);
  gap?: number;
  getItemKey?: (index: number, item: T) => string | number;
  horizontal?: boolean;
  getListElement: () => HTMLElement | null;
  getScrollElement: () => HTMLElement | Window | null;
  overscan?: { start?: number; end?: number };
  render: (args: DomVirtualListRenderArgs<T>) => void;
}
```

`getItemKey` is optional. Without it, each `setItems()` call intentionally drops cached measurements because the DOM helper cannot know whether the next array still represents the same logical rows. Provide stable keys when rows can reorder or be filtered and you want `measure()` results to carry forward.

### `DomVirtualListRenderArgs<T>`

```ts
interface DomVirtualListRenderArgs<T> {
  items: T[];
  listEl: HTMLElement;
  totalSize: number;
  virtualItems: VirtualItem[];
}
```

### `DomVirtualListController<T>`

```ts
interface DomVirtualListController<T> {
  destroy(): void;
  invalidate(): void;
  measure(index: number, size: number): void;
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void;
  setActive(active: boolean): void;
  setItems(items: T[]): void;
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

### `ScrollToIndexOptions`

```ts
interface ScrollToIndexOptions {
  align?: 'start' | 'end' | 'center' | 'auto';
  behavior?: ScrollBehavior;
}
```
