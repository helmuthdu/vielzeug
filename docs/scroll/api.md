---
title: Scroll — API Reference
description: Complete API reference for the Scroll virtual list engine.
---

[[toc]]

## API At a Glance

| Symbol                          | Purpose                                    | Execution mode         | Common gotcha                                                               |
| ------------------------------- | ------------------------------------------ | ---------------------- | --------------------------------------------------------------------------- |
| `createVirtualizer()`           | Create an attached virtual list controller | Sync                   | Attaches immediately; call after container is in the DOM                    |
| `virtualizer.update()`          | Atomically update live options             | Sync                   | Use for `count`, `estimateSize`, `gap`, `overscan`, callbacks               |
| `virtualizer.measure()`         | Record a single measured item size         | Sync (batched rebuild) | Applied after microtask flush; safe to call every render                    |
| `virtualizer.measureBatch()`    | Record multiple measured sizes at once     | Sync (batched rebuild) | Prefer over looping `measure()` for `ResizeObserver` batches                |
| `virtualizer.refresh()`         | Rebuild layout with current measurements   | Sync                   | Use after stable-key reorder/filter changes                                 |
| `createDomVirtualList()`        | DOM adapter for dropdown/listbox UIs       | Sync                   | Pass `listElement`/`scrollElement` directly; call `setTarget()` on remount  |

## Package Entry Point

| Import                 | Purpose                           |
| ---------------------- | --------------------------------- |
| `@vielzeug/scroll`     | Core virtualizer and types        |
| `@vielzeug/scroll/dom` | DOM adapter and its types         |

## Core API

### `createVirtualizer(target, options)`

```ts
createVirtualizer(target: HTMLElement | Window, options: VirtualizerOptions): Virtualizer;
```

Creates and immediately attaches a virtualizer to the provided scroll container. Returns a `Virtualizer` controller. Call `destroy()` on unmount.

```ts
import { createVirtualizer } from '@vielzeug/scroll';

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

| Option              | Type                                                                     | Default                | Description                                        |
| ------------------- | ------------------------------------------------------------------------ | ---------------------- | -------------------------------------------------- |
| `count`             | `number`                                                                 | required               | Total item count                                   |
| `estimateSize`      | `number \| (index: number) => number`                                    | `36`                   | Fixed size or per-index estimate                   |
| `gap`               | `number`                                                                 | `0`                    | Pixel gap inserted between adjacent items          |
| `getItemKey`        | `(index: number) => string \| number`                                    | `index => index`       | Stable key mapping for measurement cache           |
| `horizontal`        | `boolean`                                                                | `false`                | Use X axis instead of Y axis                       |
| `initialOffset`     | `number`                                                                 | `undefined`            | Initial scroll position set on attach              |
| `overscan`          | `{ start?: number; end?: number }`                                       | `{ start: 3, end: 3 }` | Asymmetric overscan configuration                  |
| `onChange`          | `(items: VirtualItem[], totalSize: number) => void`                      | `undefined`            | Called when render window changes                  |
| `onMeasure`         | `(index: number, oldSize: number \| undefined, newSize: number) => void` | `undefined`            | Called when a measured size is recorded or updated |
| `onScrollingChange` | `(isScrolling: boolean) => void`                                         | `undefined`            | Called on scroll state transitions                 |
| `onScrollEnd`       | `(offset: number) => void`                                               | `undefined`            | Called after debounced scroll end                  |
| `scrollEndDelay`    | `number`                                                                 | `120`                  | Debounce delay for scroll-end detection            |

**Returns:** `Virtualizer`

**Methods:**

| Method            | Signature                                                     | Description                                                  |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| `update`          | `(next: VirtualizerUpdateOptions) => void`                    | Atomically update live options                               |
| `measure`         | `(index: number, size: number) => void`                       | Record one measured size; rebuild batched in microtask       |
| `measureBatch`    | `(entries: Array<{ index: number; size: number }>) => void`   | Record many sizes; single rebuild                            |
| `refresh`         | `() => void`                                                  | Rebuild offsets, keep measurements — use after stable reorder |
| `scrollToIndex`   | `(index: number, options?: ScrollToIndexOptions) => void`     | Scroll to item; out-of-range indices are clamped             |
| `scrollToOffset`  | `(offset: number, options?: { behavior?: ScrollBehavior }) => void` | Scroll to raw pixel offset                             |
| `invalidate`      | `() => void`                                                  | Clear all measurements, rebuild from estimates               |
| `destroy`         | `() => void`                                                  | Detach listeners; idempotent                                 |
| `[Symbol.dispose]`| `() => void`                                                  | Delegates to `destroy()` — enables `using` declarations      |

## `Virtualizer` Interface

**Read-only properties:**

| Property       | Type            | Description                                 |
| -------------- | --------------- | ------------------------------------------- |
| `count`        | `number`        | Current item count                          |
| `isScrolling`  | `boolean`       | Whether a scroll is actively in progress    |
| `items`        | `VirtualItem[]` | Currently visible virtual item descriptors  |
| `scrollOffset` | `number`        | Current scroll position in pixels           |
| `totalSize`    | `number`        | Total height (or width in horizontal mode)  |

### `items` and `totalSize`

Access these directly when you need them outside of `onChange`.

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

### `measureBatch(entries)`

Records multiple measured heights in a single call. All entries are coalesced into one offset rebuild, same as calling `measure()` multiple times within a single microtask.

Prefer this over looping `measure()` when you have sizes for several indices ready at once (e.g., from a `ResizeObserver` batch or after an initial layout pass).

```ts
// After a ResizeObserver batch fires
virt.measureBatch(
  entries.map((e) => ({
    index: Number(e.target.dataset.index),
    size: e.contentRect.height,
  })),
);
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

---

## DOM Module (`@vielzeug/scroll/dom`)

### `createDomVirtualList(options)`

```ts
createVirtualList<T>(options: DomVirtualListOptions<T>): DomVirtualListController<T>;
```

Creates a DOM-focused virtual list controller around the core virtualizer. Takes direct element references for the scroll container and list element, manages their lifecycle, and applies list-height styles automatically. Returns a `DomVirtualListController<T>`.

```ts
import { createDomVirtualList } from '@vielzeug/scroll/dom';

const domList = createDomVirtualList<Row>({
  listElement: listEl,
  scrollElement: dropdownEl,
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

**Returns:** `DomVirtualListController<T>`

### `DomVirtualListOptions<T>`

```ts
interface DomVirtualListOptions<T> {
  clear?: (listEl: HTMLElement) => void;
  estimateSize?: number | ((index: number, item: T) => number);
  gap?: number;
  getItemKey?: (index: number, item: T) => string | number;
  horizontal?: boolean;
  listElement: HTMLElement;
  overscan?: { start?: number; end?: number };
  render: (args: DomVirtualListRenderArgs<T>) => void;
  scrollElement: HTMLElement | Window;
}
```

| Option        | Type                                            | Default | Description                                          |
| ------------- | ----------------------------------------------- | ------- | ---------------------------------------------------- |
| `scrollElement` | `HTMLElement \| Window`                        | required | Scroll container to observe                         |
| `listElement`   | `HTMLElement`                                  | required | List element that receives height and item children  |
| `render`        | `(args: DomVirtualListRenderArgs<T>) => void`  | required | Called whenever the visible window changes           |
| `estimateSize`  | `number \| (index, item) => number`            | `36`     | Fixed or per-item size estimate                      |
| `gap`           | `number`                                       | `0`      | Gap between items in pixels                          |
| `getItemKey`    | `(index, item) => string \| number`            | —        | Stable key; keeps measurements across `setItems`     |
| `horizontal`    | `boolean`                                      | `false`  | Use X axis                                           |
| `overscan`      | `{ start?: number; end?: number }`             | `{ start: 3, end: 3 }` | Overscan buffer on each side              |
| `clear`         | `(listEl: HTMLElement) => void`                | —        | Custom clear function; defaults to `textContent = ''` |

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
  measureBatch(entries: Array<{ index: number; size: number }>): void;
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void;
  setActive(active: boolean): void;
  setItems(items: T[]): void;
  setTarget(scrollElement: HTMLElement | Window, listElement: HTMLElement): void;
}
```

- **`setItems(items)`** — updates the current item array and re-renders. Clears measurements unless `getItemKey` is provided.
- **`setActive(active)`** — activates or deactivates the virtualizer. Deactivating destroys the internal instance and clears list styles. Idempotent.
- **`setTarget(scrollElement, listElement)`** — swaps the scroll container and list element live. Destroys and recreates the internal virtualizer. Use this when the DOM is rebuilt without destroying the controller (e.g., portal remount).
- **`measure(index, size)`** — delegates to the core `measure()`. No-op when inactive.
- **`measureBatch(entries)`** — delegates to the core `measureBatch()`. Prefer this over looping `measure()` when multiple sizes are available at once.
- **`scrollToIndex(index, options?)`** — delegates to the core `scrollToIndex()`. No-op when inactive.
- **`invalidate()`** — clears all cached measurements. No-op when inactive.
- **`destroy()`** — tears down the virtualizer, clears list styles, and prevents any further updates. Idempotent.

---

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

### `Overscan`

```ts
type Overscan = { end?: number; start?: number };
```

### `VirtualKey`

```ts
type VirtualKey = number | string;
```

### `VirtualizerUpdateOptions`

A partial of `VirtualizerOptions` excluding the creation-time options.

```ts
type VirtualizerUpdateOptions = Partial<Omit<VirtualizerOptions, 'horizontal' | 'initialOffset'>>;
```

### Constants

```ts
const DEFAULT_ESTIMATE_SIZE = 36;
const DEFAULT_OVERSCAN = 3;
const DEFAULT_SCROLL_END_DELAY = 120;
```
