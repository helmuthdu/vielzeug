# @vielzeug/scroll

> Lightweight, framework-agnostic virtual list engine with variable heights, sticky headers, grid support, and zero dependencies.

[![npm version](https://img.shields.io/npm/v/@vielzeug/scroll)](https://www.npmjs.com/package/@vielzeug/scroll) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/scroll` &nbsp;·&nbsp; **Category:** UI Performance

**Key exports:** `createVirtualizer`, `createDomVirtualList`, `createVirtualScroller`, `createGroupedVirtualizer`, `createGridVirtualizer`, `createReactiveVirtualizer`

**When to use:** Render only visible rows in large lists. Supports fixed heights, variable heights, sticky headers, grouped sections, grid virtualization, programmatic scrolling, and reactive signal integration.

**Related:** [@vielzeug/dnd](https://vielzeug.dev/dnd/) · [@vielzeug/ore](https://vielzeug.dev/ore/) · [@vielzeug/refine](https://vielzeug.dev/refine/)

</details>

`@vielzeug/scroll` is part of Vielzeug and ships as a TypeScript package with ESM+CJS output. The only dependency is `@vielzeug/ripple`, used by the optional reactive integration.

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
    listEl.innerHTML = '';

    for (const item of items) {
      const row = document.createElement('div');
      row.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:${item.size}px;`;
      row.textContent = `Row ${item.index}`;
      listEl.appendChild(row);
    }
  },
});

// Later:
virt.destroy();
```

## DOM Adapter

`createDomVirtualList` manages the virtualizer lifecycle and handles list-height styles automatically. Items are passed as enriched `VirtualRenderItem<T>` objects (layout fields + `.data`). Use `recycle` for efficient DOM node reuse.

```ts
import { createDomVirtualList } from '@vielzeug/scroll';

type Option = { label: string; value: string };

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
domList.destroy();
```

## Self-Contained Scroller

`createVirtualScroller` creates the scroll container and list element for you and appends them to a host element:

```ts
import { createVirtualScroller } from '@vielzeug/scroll';

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
list.destroy(); // also removes the generated scroll container
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
virt.destroy();
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
grid.destroy();
```

## Reactive Integration

`createReactiveVirtualizer` wraps the core virtualizer and exposes state as a `Signal<VirtualizerState>` from `@vielzeug/ripple`:

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
  // render items...
});

virt.destroy();
```

## Documentation

- [Overview](https://vielzeug.dev/scroll/)
- [Usage Guide](https://vielzeug.dev/scroll/usage)
- [API Reference](https://vielzeug.dev/scroll/api)
- [Examples](https://vielzeug.dev/scroll/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
