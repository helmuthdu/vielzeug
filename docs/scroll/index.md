---
title: Scroll — Virtual list engine for TypeScript
description: Lightweight, framework-agnostic virtual list engine with variable heights, sticky headers, grid support, and zero dependencies.
package: scroll
category: ui-performance
keywords: [virtual-list, virtualization, windowing, scroll, performance, large-lists]
related: [grip, craft, sigil]
exports:
  [
    createVirtualizer,
    createDomVirtualList,
    createVirtualScroller,
    createGroupedVirtualizer,
    createGridVirtualizer,
    createReactiveVirtualizer,
    createMeasurementCache,
    DEFAULT_ESTIMATE_SIZE,
    DEFAULT_OVERSCAN,
  ]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="scroll" />

## Why Scroll?

Rendering thousands of items as real DOM nodes freezes the browser. Each node consumes layout, paint, and memory — long lists need to render only what is visible in the viewport.

```ts
// Before — render all 10 000 items (browser freezes)
list.innerHTML = '';
items.forEach((item) => {
  const el = document.createElement('div');
  el.textContent = item.name;
  list.appendChild(el); // 10 000 DOM nodes
});

// After — Scroll (only ~15 visible rows in the DOM at any time)
import { createVirtualizer } from '@vielzeug/scroll';
const virt = createVirtualizer(scrollEl, {
  count: items.length,
  estimateSize: 36,
  onChange: ({ items, totalSize }) => {
    list.style.height = `${totalSize}px`;
    list.innerHTML = '';
    for (const { index, start } of items) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${start}px;height:36px;`;
      el.textContent = items[index].name;
      list.appendChild(el);
    }
  },
});
```

| Feature            | Scroll                                       | TanStack Virtual | react-window |
| ------------------ | -------------------------------------------- | ---------------- | ------------ |
| Bundle size        | <PackageInfo package="scroll" type="size" /> | ~5 kB            | ~8 kB        |
| Framework agnostic | <sg-icon name="check" size="16"></sg-icon>                                           | <sg-icon name="check" size="16"></sg-icon>               | React only   |
| Variable heights   | <sg-icon name="check" size="16"></sg-icon> Measured                                  | <sg-icon name="check" size="16"></sg-icon>               | <sg-icon name="triangle-alert" size="16"></sg-icon> Static    |
| O(log n) lookup    | <sg-icon name="check" size="16"></sg-icon>                                           | <sg-icon name="check" size="16"></sg-icon>               | <sg-icon name="check" size="16"></sg-icon>           |
| `using` support    | <sg-icon name="check" size="16"></sg-icon>                                           | <sg-icon name="x" size="16"></sg-icon>               | <sg-icon name="x" size="16"></sg-icon>           |
| Zero dependencies  | <sg-icon name="check" size="16"></sg-icon>                                           | <sg-icon name="check" size="16"></sg-icon>               | <sg-icon name="check" size="16"></sg-icon>           |

<div class="decision-callout">

**Use Scroll when** you need to render large lists in a framework-agnostic environment with precise control over item measurement and scroll position.

**Consider TanStack Virtual** if you need its framework adapters and ecosystem integration.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/scroll
```

```sh [npm]
npm install @vielzeug/scroll
```

```sh [yarn]
yarn add @vielzeug/scroll
```

:::

## Quick Start

```ts
import { createVirtualizer } from '@vielzeug/scroll';

const scrollEl = document.querySelector<HTMLElement>('.scroll-container')!;
const spacer = document.querySelector<HTMLElement>('.spacer')!;
const list = document.querySelector<HTMLElement>('.list')!;

const virt = createVirtualizer(scrollEl, {
  count: 10_000,
  estimateSize: 36,
  onChange: ({ items, totalSize }) => {
    // Stretch the container so the scrollbar reflects the full list
    spacer.style.height = `${totalSize}px`;
    list.innerHTML = '';

    for (const item of items) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;`;
      el.textContent = `Row ${item.index}`;
      list.appendChild(el);
    }
  },
});

// Clean up
virt.destroy();
```

### Entry Points

All APIs export from a single entry: `@vielzeug/scroll`.

## Features

<div class="features-grid">

- **Framework-agnostic** — callback-based `onChange` connects to any rendering layer (React, Vue, Svelte, Lit, vanilla DOM)
- **Fixed and variable heights** — pass a fixed number, a per-index estimator function, or call `measure()` after rendering for exact heights
- **Batched measurements** — calling `measure()` many times in a single tick coalesces into one prefix-sum rebuild via `queueMicrotask`
- **Stable-key reflow** — call `refresh()` after reorder/filter changes to rebuild offsets without discarding measured sizes; `redraw()` for O(1) re-emission when sizes are unchanged
- **Sticky headers** — mark items with `sticky` to pin them at the viewport top; `createGroupedVirtualizer` handles section headers automatically
- **Grouped sections** — `createGroupedVirtualizer` virtualizes sectioned data with per-section headers, `onChange` state, and `scrollToSection`/`scrollToItem`
- **Grid virtualization** — `createGridVirtualizer` virtualizes two-dimensional data with independent row/column measurement and `scrollToCell`
- **Reactive integration** — `createReactiveVirtualizer` exposes state as a `Signal<VirtualizerState>` compatible with `@vielzeug/ripple`
- **DOM adapter** — `createDomVirtualList` and `createVirtualScroller` manage virtualizer lifecycle, list-height styles, and DOM node pooling
- **Skipped re-renders** — `onChange` is not called when a scroll event doesn't move the visible window across an item boundary
- **Programmatic scrolling** — `scrollToIndex()` with `start`, `end`, `center`, and `auto` alignment; `scrollToOffset()` for pixel control; both support `behavior: 'smooth'`
- **Horizontal + window targets** — supports both element and `window` scrolling, in vertical or horizontal mode
- **Asymmetric overscan + gap** — tune start/end overscan independently and add inter-item spacing
- **Atomic updates** — `virt.update(...)` lets you change count, estimator, overscan, and more in one call
- **Clamp-safe** — `scrollToIndex` silently clamps out-of-range indices
- **Prepend support** — `prepend()` adds items at the top while keeping the viewport visually stable
- **Disposable** — implements `[Symbol.dispose]` for `using` declarations
- **Zero runtime dependencies** (ripple is a peer dependency used only by `createReactiveVirtualizer`)

</div>


## How It Works

Scroll maintains a prefix-sum offset array. On every scroll event it runs two binary searches — one for the first visible index, one for the last — to determine the render window in O(log n) time. Only the items within that window (plus `overscan` on each side) are passed to `onChange`.

```text
Items:    [0]  [1]  [2]  [3]  [4]  [5]  [6]  ...
Offsets:   0   36   72  108  144  180  216  ...

scrollTop = 90, containerHeight = 120 → visible items 2–5
With overscan=3: render items 0–8
```

The offset array is rebuilt (O(n)) only when layout inputs change: on `measure()` flush, `refresh()`, `update({ count })`, `update({ estimateSize })`, or `invalidate()`. Scroll and resize events recompute the visible window without rebuilding offsets.

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Sigil](/sigil/) — accessible web components that use Scroll internally for virtualized listboxes and comboboxes
- [Craft](/craft/) — web-component authoring layer; use with Scroll to build virtualizing custom elements
- [Grip](/grip/) — drag-and-drop engine; combine with Scroll to make sortable virtual lists

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
