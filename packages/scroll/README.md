# @vielzeug/scroll

> Lightweight, framework-agnostic virtual list engine with variable heights, sticky headers, grid support, and optional reactive integration.

[![npm version](https://img.shields.io/npm/v/@vielzeug/scroll)](https://www.npmjs.com/package/@vielzeug/scroll) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/scroll` &nbsp;·&nbsp; **Category:** UI Performance

**Key exports:** `createVirtualizer`, `createDomVirtualList`, `createVirtualScroller`, `createGroupedVirtualizer`, `createGridVirtualizer`

**When to use:** Render only visible rows in large lists. Supports fixed heights, variable heights, sticky headers, grouped sections, grid virtualization, programmatic scrolling, and optional reactive signal integration.

**Related:** [@vielzeug/dnd](https://vielzeug.dev/dnd/) · [@vielzeug/ore](https://vielzeug.dev/ore/) · [@vielzeug/refine](https://vielzeug.dev/refine/)

</details>

`@vielzeug/scroll` is part of Vielzeug and ships as a TypeScript package with ESM+CJS output. The only dependency is `@vielzeug/ripple`, used by the optional reactive signal integration.

## Choosing a Factory

Each factory serves a specific use case. Pick the one that matches your needs:

| Factory | Use Case | Benefits | Trade-offs |
|---------|----------|----------|-----------|
| **`createVirtualizer`** | Low-level scroll optimization with manual DOM | Full control, minimal overhead | You manage layout and DOM updates |
| **`createDomVirtualList`** | Rendering a data-bound list with automatic cleanup | Auto height management, item recycling, stick-to-bottom | Less control over container |
| **`createVirtualScroller`** | Quick setup: auto-creates scroll + list containers | Minimal setup, self-contained | Less flexibility over structure |
| **`createGroupedVirtualizer`** | Lists with grouped sections and sticky headers | Automatic sticky headers, section navigation | Not suitable for flat lists |
| **`createGridVirtualizer`** | 2D grids (spreadsheets, photo galleries) | Row + column virtualization, automatic cell layout | More complex to render |

### Quick Decision Tree

```
Do you need a 2D grid (rows AND columns)?
├─ YES → createGridVirtualizer
└─ NO
   Do your items have sections with headers?
   ├─ YES → createGroupedVirtualizer
   └─ NO
      Do you want scroll + list containers auto-created?
      ├─ YES → createVirtualScroller
      └─ NO
         Do you have data items that need recycling?
         ├─ YES → createDomVirtualList
         └─ NO → createVirtualizer (full control)
```

## Installation

```sh
pnpm add @vielzeug/scroll
npm install @vielzeug/scroll
yarn add @vielzeug/scroll
```

## Quick Start

```ts
import { createVirtualizer } from '@vielzeug/scroll';

const scrollEl = document.querySelector<HTMLElement>('.scroll-container')!;
const listEl = document.querySelector<HTMLElement>('.list')!;

const virt = createVirtualizer(scrollEl, {
  count: 10_000,
  estimateSize: 36,
  onChange: ({ items, totalSize }) => {
    listEl.style.height = `${totalSize}px`;
    listEl.replaceChildren();

    for (const item of items) {
      const row = document.createElement('div');
      row.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:${item.size}px;`;
      row.textContent = `Row ${item.index}`;
      listEl.appendChild(row);
    }
  },
});

// Later:
virt.dispose();
```

## DOM Adapter

`createDomVirtualList` manages the virtualizer lifecycle and handles list-height styles automatically. Items are passed as enriched `VirtualRenderItem<T>` objects (layout fields + `.data`). Use `recycle` for efficient DOM node reuse.

```ts
import { createDomVirtualList } from '@vielzeug/scroll';

type Option = { label: string; value: string };

const dropdownEl = document.querySelector<HTMLElement>('.dropdown')!;
const listEl = document.querySelector<HTMLElement>('.list')!;
const options: Option[] = [{ label: 'Ada Lovelace', value: 'ada' }];
const focusedIndex = 0;

const domList = createDomVirtualList<Option>({
  estimateSize: 36,
  getItemKey: (_, opt) => opt.value,
  listElement: listEl,
  scrollElement: dropdownEl,
  render: ({ items, listEl, recycle }) => {
    for (const item of items) {
      const el = recycle(item.data.value, () => document.createElement('div'));
      el.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.start}px);height:${item.size}px;`;
      el.textContent = item.data.label;
      listEl.appendChild(el);
    }
  },
});

domList.setItems(options);
domList.scrollToIndex(focusedIndex, { align: 'auto' });
domList.dispose();
```

## Self-Contained Scroller

`createVirtualScroller` creates the scroll container and list element for you and appends them to a host element:

```ts
import { createVirtualScroller } from '@vielzeug/scroll';

type Option = { label: string; value: string };

const options: Option[] = [{ label: 'Ada Lovelace', value: 'ada' }];
const list = createVirtualScroller<Option>(document.getElementById('root')!, {
  estimateSize: 36,
  render: ({ items, listEl, recycle }) => {
    for (const item of items) {
      const el = recycle(item.data.value, () => document.createElement('div'));
      el.textContent = item.data.label;
      el.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.start}px);`;
      listEl.appendChild(el);
    }
  },
});

list.setItems(options);
list.dispose(); // also removes the generated scroll container
```

## Grouped Lists

`createGroupedVirtualizer` handles sectioned data with sticky headers automatically:

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
    // render headers and items from a flat offset table
  },
});

virt.scrollToSection(1, { align: 'start' });
virt.update(nextSections);
virt.dispose();
```

## Grid Virtualization

```ts
import { createGridVirtualizer } from '@vielzeug/scroll';

const grid = createGridVirtualizer(scrollEl, {
  rowCount: 10_000,
  colCount: 50,
  estimateRowSize: 36,
  estimateColSize: 120,
  onChange: ({ rows, cols, totalHeight, totalWidth }) => {
    // form the cross-product rows × cols and render each visible cell
  },
});

grid.scrollToCell(500, 10, { rowAlign: 'center', colAlign: 'start' });
grid.dispose();
```

## Measurement Methods

Items can have variable heights. Measure them once, and the offset table updates automatically.

### `measure(index, size)`
Measure a single item. Use when one item's size changes (e.g., image loaded).
```ts
virt.measure(42, 120);  // Item 42 is now 120px tall
```

### `measureBatch(entries)`
Measure multiple items in one operation. Coalesces updates into a single rebuild.
```ts
virt.measureBatch([
  { index: 10, size: 150 },
  { index: 11, size: 140 },
  { index: 12, size: 160 },
]);
```

### `measureEl(index, el)`
Auto-observe an element's size with `ResizeObserver`. Useful for dynamic content (videos, expanding text).
```ts
const disconnect = virt.measureEl(42, videoElement);
// Later:
disconnect();  // Stop observing
```

## Migration Guide

### Switching from `createVirtualizer` to `createDomVirtualList`

If you're manually managing a list and want item recycling + auto-height:

```ts
// Before:
const virt = createVirtualizer(scrollEl, {
  count: items.length,
  onChange: ({ items: renderItems, totalSize }) => {
    listEl.style.height = `${totalSize}px`;
    // manual DOM updates
  },
});

// After:
const virt = createDomVirtualList({
  items,
  scrollElement: scrollEl,
  listElement: listEl,
  render: ({ items: renderItems, recycle }) => {
    // recycled DOM updates
  },
});
virt.setItems(newItems);  // Auto-rebuilds
```

### Switching from flat list to grouped

When your data gains structure (sections with headers):

```ts
// Before:
const virt = createVirtualizer(scrollEl, { count: items.length });

// After:
const virt = createGroupedVirtualizer(scrollEl, {
  sections: [
    { label: 'Section A', items: itemsA },
    { label: 'Section B', items: itemsB },
  ],
});
```

Changes needed in your render function:
- Receive `headers` array in addition to `items`
- Render headers with `.start`, `.size`, `.label`
- Render items with `.data` field containing the item

## Keyboard Navigation

Enable keyboard-based scrolling with the `keyboardScroll` option:

```ts
const virt = createVirtualizer(scrollEl, {
  count: 1000,
  estimateSize: 40,
  keyboardScroll: true,
});
```

Supported keys:
- **Arrow Up/Down** (or Left/Right for horizontal lists) — Scroll by one estimated item size
- **Page Up/Down** — Scroll by ~80% of viewport height (configurable with Page Down/Up key modifiers)
- **Home** — Jump to the start
- **End** — Jump to the end

**Requirements:**
- The scroll container (or a descendant) must have focus for keyboard events to fire
- Works with all factories: `createVirtualizer`, `createDomVirtualList`, `createGroupedVirtualizer`, `createGridVirtualizer`
- Grid virtualization supports separate row/column scrolling (arrows navigate rows or columns independently)

## Auto-Measurement

For dynamic or user-generated content with variable sizes, enable `autoMeasure` to automatically measure visible items:

```ts
const virt = createVirtualizer(scrollEl, {
  count: 1000,
  estimateSize: 40,
  autoMeasure: true,
});
```

**How it works:**
- Each rendered item is automatically measured via `ResizeObserver`
- Measurements are cached and the virtualizer recomputes layout in real time
- Useful for content that grows/shrinks (expanding text, loading spinners, videos)

**Requirements:**
- Every rendered item must have a `data-vz-key` attribute set to the item's key:
  ```ts
  const virt = createVirtualizer(scrollEl, {
    count: items.length,
    getItemKey: (i) => items[i].id,
    onChange: ({ items: renderItems, totalSize }) => {
      listEl.style.height = `${totalSize}px`;
      for (const item of renderItems) {
        const el = document.createElement('div');
        el.setAttribute('data-vz-key', items[item.index].id);  // <-- Required
        el.textContent = items[item.index].text;
        listEl.appendChild(el);
      }
    },
  });
  ```
- Must use a DOM scroll target (not `Window`)
- For more control, use `measureEl()` manually instead

**Caveats:**
- `autoMeasure` queries the DOM every render cycle; avoid with very large visible windows (100+ items)
- Elements are looked up in the scroll target; ensure elements are direct/indirect children
- ResizeObserver cleanup is automatic on `dispose()`

## Reactive Integration

Any virtualizer can emit state to a reactive `Signal` from `@vielzeug/ripple` by providing a `signal` option:

```ts
import { createVirtualizer } from '@vielzeug/scroll';
import { signal, effect } from '@vielzeug/ripple';

const virt = createVirtualizer(scrollEl, {
  count: 1000,
  estimateSize: 40,
  signal: (init) => signal(init),  // Create and emit to a signal
});

effect(() => {
  const { items, totalSize } = virt.state.value;
  listEl.style.height = `${totalSize}px`;
  // render items...
});

virt.dispose();
```

The `signal` option works with all factories (`createDomVirtualList`, `createGroupedVirtualizer`, `createGridVirtualizer`, etc.) and works alongside the `onChange` callback if provided.

## Documentation

- [Overview](https://vielzeug.dev/scroll/)
- [Usage Guide](https://vielzeug.dev/scroll/usage)
- [API Reference](https://vielzeug.dev/scroll/api)
- [Examples](https://vielzeug.dev/scroll/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
