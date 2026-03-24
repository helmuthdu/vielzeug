---
title: Virtualit — API Reference
description: Complete API reference for the Virtualit virtual list engine.
---

# Virtualit API Reference

[[toc]]

## API At a Glance

| Symbol                          | Purpose                                 | Execution mode | Common gotcha                                   |
| ------------------------------- | --------------------------------------- | -------------- | ----------------------------------------------- |
| `createVirtualizer()`           | Create virtual list controller          | Sync           | Call attach() with the correct scroll container |
| `createDomVirtualList()`        | DOM-first wrapper around `Virtualizer`  | Sync           | Call `update(items, enabled)` after mount       |
| `virtualizer.getVirtualItems()` | Read the currently visible range        | Sync           | Re-render after invalidation/size changes       |
| `virtualizer.scrollToIndex()`   | Programmatically jump to item positions | Sync           | Attach first; no-op before mounting             |

## Package Exports

```ts
export { Virtualizer, createVirtualizer } from '@vielzeug/virtualit';
export type { ScrollToIndexOptions, VirtualItem, VirtualizerOptions } from '@vielzeug/virtualit';

export { createDomVirtualList } from '@vielzeug/virtualit/dom';
export type { DomVirtualListController, DomVirtualListOptions, DomVirtualListRenderArgs } from '@vielzeug/virtualit/dom';
```

## DOM Module (`@vielzeug/virtualit/dom`)

The DOM module is a convenience wrapper for dropdown/listbox style UIs where you already own DOM rendering and want a tiny controller with `update()`, `scrollToIndex()`, and `destroy()`.

### `createDomVirtualList(options)`

Creates a controller that lazily manages an internal `Virtualizer` when the scroll/list elements exist and virtualization is enabled.

```ts
import { createDomVirtualList } from '@vielzeug/virtualit/dom';

const virtualList = createDomVirtualList<Row>({
  clear: (listEl) => {
    listEl.innerHTML = '';
  },
  estimateSize: 36,
  getListElement: () => listEl,
  getScrollElement: () => dropdownEl,
  render: ({ items, listEl, virtualItems }) => {
    listEl.innerHTML = '';

    for (const item of virtualItems) {
      const row = document.createElement('div');
      row.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.top}px);`;
      row.textContent = items[item.index]?.label ?? '';
      listEl.appendChild(row);
    }
  },
});

virtualList.update(rows, true);
```

**Parameters:**

| Parameter | Type                     | Description |
| --------- | ------------------------ | ----------- |
| `options` | `DomVirtualListOptions<T>` | DOM adapter callbacks and sizing behavior |

**Returns:** `DomVirtualListController<T>`

---

### `DomVirtualListOptions<T>`

```ts
interface DomVirtualListOptions<T> {
  clear: (listEl: HTMLElement) => void;
  estimateSize: number | ((index: number, item: T) => number);
  getListElement: () => HTMLElement | null;
  getScrollElement: () => HTMLElement | null;
  overscan?: number;
  render: (args: DomVirtualListRenderArgs<T>) => void;
}
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `clear` | `(listEl: HTMLElement) => void` | — | Clears previously rendered option nodes before repaint or teardown |
| `estimateSize` | `number \| (index: number, item: T) => number` | — | Fixed row size or per-item estimator |
| `getListElement` | `() => HTMLElement \| null` | — | Returns the positioned list element that receives item nodes |
| `getScrollElement` | `() => HTMLElement \| null` | — | Returns the scroll container observed by the virtualizer |
| `overscan` | `number` | `3` | Extra items rendered above and below viewport |
| `render` | `(args: DomVirtualListRenderArgs<T>) => void` | — | Called when visible window changes |

---

### `DomVirtualListRenderArgs<T>`

```ts
interface DomVirtualListRenderArgs<T> {
  items: T[];
  listEl: HTMLElement;
  virtualItems: VirtualItem[];
}
```

---

### `DomVirtualListController<T>`

```ts
interface DomVirtualListController<T> {
  destroy: () => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  update: (items: T[], enabled: boolean) => void;
}
```

#### `update(items, enabled)`

Synchronizes source items and enable state. When `enabled` is `false`, when items are empty, or when required DOM elements are missing, the internal virtualizer is destroyed and list styles are reset.

#### `scrollToIndex(index, options?)`

Proxies to the internal virtualizer when active. If not active yet, this is a no-op.

#### `destroy()`

Idempotent teardown. Destroys the internal virtualizer and resets list element styles.

## Core Functions

### `createVirtualizer(el, options)`

Creates a `Virtualizer` and immediately attaches it to the given scroll container.

**Parameters:**

| Parameter | Type                 | Description                     |
| --------- | -------------------- | ------------------------------- |
| `el`      | `HTMLElement`        | The scroll container to observe |
| `options` | `VirtualizerOptions` | See below                       |

**`VirtualizerOptions`:**

| Option         | Type                                                | Default | Description                                                                                                                                        |
| -------------- | --------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `count`        | `number`                                            | —       | Total number of items in the list                                                                                                                  |
| `estimateSize` | `number \| (index: number) => number`               | `36`    | Fixed row height or a per-index estimator. Used to build the initial offset table and as a fallback until `measureElement()` provides exact values |
| `overscan`     | `number`                                            | `3`     | Number of items to render beyond the visible viewport edge on each side. Higher values reduce blank flashes during fast scrolling                  |
| `onChange`     | `(items: VirtualItem[], totalSize: number) => void` | —       | Called whenever the visible render window changes. Use this to update your DOM                                                                     |

**Returns:** `Virtualizer`

**Example:**

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 36,
  overscan: 4,
  onChange: (virtualItems, totalSize) => {
    list.style.height = `${totalSize}px`;
    list.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;`;
      el.textContent = rows[item.index].label;
      list.appendChild(el);
    }
  },
});
```

---

## `Virtualizer` Class

The `Virtualizer` class is available for cases where you need to construct without immediately attaching (e.g. the scroll container is not yet in the DOM).

```ts
import { Virtualizer } from '@vielzeug/virtualit';

const virt = new Virtualizer({ count: 100, estimateSize: 36, onChange: render });
// Later:
virt.attach(scrollEl);
```

### Constructor

```ts
new Virtualizer(options: VirtualizerOptions)
```

Constructs the instance and builds the offset table. Does **not** call `onChange` — that is deferred until `attach()` so the first render always has a real container height.

---

### Properties

#### `count` (get / set)

```ts
get count(): number
set count(value: number): void
```

The total number of items. Assigning to the setter rebuilds the offset table and triggers a re-render (calls `onChange`) if the virtualizer is currently attached. Safe to set before `attach()` — `onChange` will not fire until attachment.

```ts
// Extend the list after loading more data
data.push(...newPage);
virt.count = data.length;
```

---

#### `estimateSize` (set only)

```ts
set estimateSize(fn: number | ((index: number) => number)): void
```

Replaces the size estimator. Clears all previously measured heights, rebuilds the offset table, and triggers a re-render if attached. Useful for switching between row density modes without recreating the virtualizer.

```ts
virt.estimateSize = 32; // compact
virt.estimateSize = 48; // comfortable
virt.estimateSize = (i) => (sections[i].isHeader ? 56 : 40);
```

---

### Methods

#### `attach(el)`

```ts
attach(el: HTMLElement): void
```

Attaches the virtualizer to a scroll container. Sets up a passive `scroll` listener and a `ResizeObserver`. Reads the current `clientHeight` and `scrollTop`, then fires `onChange` with the initial visible window.

Can be called multiple times to re-attach to a different element. The previous listeners are removed before the new ones are set up.

```ts
virt.attach(scrollEl);

// Re-attach to a new element (e.g. dropdown re-opened with a different DOM node)
virt.attach(newScrollEl);
```

---

#### `destroy()`

```ts
destroy(): void
```

Removes the scroll listener and disconnects the `ResizeObserver`. Idempotent — safe to call multiple times or when the element has already been removed from the DOM.

---

#### `[Symbol.dispose]()`

```ts
[Symbol.dispose](): void
```

Delegates to `destroy()`. Enables the Explicit Resource Management `using` declaration.

```ts
{
  using virt = createVirtualizer(scrollEl, { count: 100, onChange: render });
}
// virt.destroy() called automatically
```

---

#### `getVirtualItems()`

```ts
getVirtualItems(): VirtualItem[]
```

Returns the current array of rendered virtual items. The array is replaced on every `onChange` call — do not store references across renders.

```ts
const items = virt.getVirtualItems();
// [{ index: 2, top: 72, height: 36 }, { index: 3, top: 108, height: 36 }, ...]
```

---

#### `getTotalSize()`

```ts
getTotalSize(): number
```

Returns the total pixel height of the full list — the sum of all item heights using measured heights where available and estimates elsewhere. Set this as the height of your spacer/container element so the scrollbar accurately represents the full list.

```ts
spacer.style.height = `${virt.getTotalSize()}px`;
```

---

#### `measureElement(index, height)`

```ts
measureElement(index: number, height: number): void
```

Records an exact measured height for an item. Calls within the same microtask tick are batched — the offset table is rebuilt once after all measurements for the tick have been applied.

Has no effect if the `height` is identical to the item's current effective height (measured or estimated). This makes it safe to call unconditionally after each render without triggering unnecessary rebuilds.

```ts
// After rendering, measure each item
for (const item of virt.getVirtualItems()) {
  const el = container.querySelector<HTMLElement>(`[data-index="${item.index}"]`);
  if (el) virt.measureElement(item.index, el.offsetHeight);
}
```

---

#### `scrollToIndex(index, options?)`

```ts
scrollToIndex(index: number, options?: ScrollToIndexOptions): void
```

Programmatically scrolls to bring an item into view. Out-of-range indices are clamped to `[0, count - 1]`.

If the virtualizer is not attached yet, the call is a no-op.

**`ScrollToIndexOptions`:**

| Option     | Type                                     | Default  | Description                                                       |
| ---------- | ---------------------------------------- | -------- | ----------------------------------------------------------------- |
| `align`    | `'start' \| 'end' \| 'center' \| 'auto'` | `'auto'` | Where to position the target item in the viewport                 |
| `behavior` | `ScrollBehavior`                         | `'auto'` | Native `scrollTo` behaviour: `'auto'`, `'instant'`, or `'smooth'` |

**`align` values:**

| Value      | Description                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| `'start'`  | Item top edge aligns with the container top edge                                                           |
| `'end'`    | Item bottom edge aligns with the container bottom edge                                                     |
| `'center'` | Item is centered in the viewport                                                                           |
| `'auto'`   | No scroll if the item is already fully visible; otherwise scrolls the minimum amount to bring it into view |

```ts
virt.scrollToIndex(0); // jump to top
virt.scrollToIndex(99, { align: 'end' }); // jump to bottom
virt.scrollToIndex(50, { align: 'center', behavior: 'smooth' });
virt.scrollToIndex(focusedIdx, { align: 'auto' }); // only if needed
```

---

#### `scrollToOffset(offset, options?)`

```ts
scrollToOffset(offset: number, options?: { behavior?: ScrollBehavior }): void
```

Scrolls to an exact pixel offset from the top of the scroll container. Negative values are clamped to `0`.

```ts
virt.scrollToOffset(0); // scroll to top
virt.scrollToOffset(1440); // scroll to 1440px
virt.scrollToOffset(savedOffset, { behavior: 'smooth' });
```

---

#### `invalidate()`

```ts
invalidate(): void
```

Clears all measured heights recorded by `measureElement()`, rebuilds the offset table using the estimator, and triggers a re-render if attached.

Call this after any external event that changes item heights but does not change item data: a font load, a container width change causing text to reflow, or toggling between layout modes.

```ts
document.fonts.ready.then(() => virt.invalidate());
window.addEventListener('resize', () => virt.invalidate());
```

---

## Types

### `VirtualItem`

A single rendered item descriptor passed to `onChange`. Each field is read-only during a render cycle.

```ts
interface VirtualItem {
  /** Position in the full source list (0-based) */
  index: number;
  /** Pixel offset from the top of the scroll area */
  top: number;
  /** Measured (via measureElement) or estimated height in pixels */
  height: number;
}
```

---

### `VirtualizerOptions`

```ts
interface VirtualizerOptions {
  count: number;
  estimateSize?: number | ((index: number) => number);
  overscan?: number;
  onChange?: (items: VirtualItem[], totalSize: number) => void;
}
```

---

### `ScrollToIndexOptions`

```ts
interface ScrollToIndexOptions {
  align?: 'start' | 'end' | 'center' | 'auto';
  behavior?: ScrollBehavior; // 'auto' | 'instant' | 'smooth'
}
```
