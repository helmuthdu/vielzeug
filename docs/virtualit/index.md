---
title: Virtualit — Virtual list engine for TypeScript
description: Lightweight, framework-agnostic virtual list engine with variable heights, smooth scrolling, and zero dependencies.
---

<PackageBadges package="virtualit" />

<img src="/logo-virtualit.svg" alt="Virtualit logo" width="156" class="logo-highlight"/>

# Virtualit

**Virtualit** is a framework-agnostic virtual list engine. It renders only the items visible in the viewport plus a configurable overscan buffer, keeping the DOM small regardless of how many items are in your dataset.

<!-- Search keywords: virtual list, windowed rendering, large list performance. -->

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/virtualit
```

```sh [npm]
npm install @vielzeug/virtualit
```

```sh [yarn]
yarn add @vielzeug/virtualit
```

:::

## Quick Start

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const scrollEl = document.querySelector<HTMLElement>('.scroll-container')!;
const spacer = document.querySelector<HTMLElement>('.spacer')!;
const list = document.querySelector<HTMLElement>('.list')!;

const virt = createVirtualizer(scrollEl, {
  count: 10_000,
  estimateSize: 36,
  onChange: (virtualItems, totalSize) => {
    // Stretch the container so the scrollbar reflects the full list
    spacer.style.height = `${totalSize}px`;
    list.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;`;
      el.textContent = `Row ${item.index}`;
      list.appendChild(el);
    }
  },
});

// Clean up
virt.destroy();
```

## Entry Points

- `@vielzeug/virtualit` — core `Virtualizer` and `createVirtualizer` primitives.
- `@vielzeug/virtualit/dom` — `createDomVirtualList` helper for dropdown/listbox-style DOM integrations.

## Why Virtualit?

Rendering thousands of items as real DOM nodes freezes the browser. Each node consumes layout, paint, and memory — long lists need to render only what is visible in the viewport.

```ts
// Before — render all 10 000 items (browser freezes)
list.innerHTML = '';
items.forEach((item) => {
  const el = document.createElement('div');
  el.textContent = item.name;
  list.appendChild(el); // 10 000 DOM nodes
});

// After — Virtualit (only ~15 visible rows in the DOM at any time)
import { createVirtualizer } from '@vielzeug/virtualit';
const virt = createVirtualizer(scrollEl, {
  count: items.length,
  estimateSize: 36,
  onChange: (virtualItems, totalSize) => {
    list.style.height = `${totalSize}px`;
    list.innerHTML = '';
    for (const { index, top } of virtualItems) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${top}px;height:36px;`;
      el.textContent = items[index].name;
      list.appendChild(el);
    }
  },
});
```

| Feature            | Virtualit                                       | TanStack Virtual | react-window |
| ------------------ | ----------------------------------------------- | ---------------- | ------------ |
| Bundle size        | <PackageInfo package="virtualit" type="size" /> | ~5 kB            | ~8 kB        |
| Framework agnostic | ✅                                              | ✅               | React only   |
| Variable heights   | ✅ Measured                                     | ✅               | ⚠️ Static    |
| O(log n) lookup    | ✅                                              | ✅               | ✅           |
| `using` support    | ✅                                              | ❌               | ❌           |
| Zero dependencies  | ✅                                              | ✅               | ✅           |

**Use Virtualit when** you need to render large lists in a framework-agnostic environment with precise control over item measurement and scroll position.

**Consider TanStack Virtual** if you need its React/Vue/Solid adapters, horizontal virtualisation, or window-based (not container-based) virtualisation.

## Features

- **Framework-agnostic** — callback-based `onChange` connects to any rendering layer (React, Vue, Svelte, Lit, vanilla DOM)
- **Fixed and variable heights** — pass a fixed number, a per-index estimator function, or call `measureElement()` after rendering for exact heights
- **Batched measurements** — calling `measureElement()` many times in a single tick coalesces into one prefix-sum rebuild via `queueMicrotask`
- **Skipped re-renders** — `onChange` is not called when a scroll event doesn't move the visible window across an item boundary
- **Programmatic scrolling** — `scrollToIndex()` with `start`, `end`, `center`, and `auto` alignment; `scrollToOffset()` for pixel control; both support `behavior: 'smooth'`
- **Reactive setters** — assigning `virt.count` or `virt.estimateSize` rebuilds and re-renders automatically
- **Clamp-safe** — `scrollToIndex` silently clamps out-of-range indices rather than silently scrolling to the wrong position
- **Disposable** — implements `[Symbol.dispose]` for `using` declarations
- **Zero dependencies**

## Compatibility

| Environment | Support       |
| ----------- | ------------- |
| Browser     | ✅            |
| Node.js     | ❌ (DOM only) |
| SSR         | ❌ (DOM only) |
| Deno        | ❌            |

## Prerequisites

- Browser DOM environment with scroll container measurement.
- A fixed-height scroll container with `overflow: auto` and a positioned inner list layer.
- Item renderer that applies absolute positioning from virtual item offsets.

## How It Works

Virtualit maintains a `Float64Array` prefix-sum of item offsets. On every scroll event it runs two binary searches — one for the first visible index, one for the last — to determine the render window in O(log n) time. Only the items within that window (plus `overscan` on each side) are passed to `onChange`.

```
Items:    [0]  [1]  [2]  [3]  [4]  [5]  [6]  ...
Offsets:   0   36   72  108  144  180  216  ...

scrollTop = 90, containerHeight = 120 → visible items 2–5
With overscan=3: render items 0–8
```

The offset array is rebuilt (O(n)) only when item heights change: on `measureElement()` flush, `count` change, `estimateSize` change, or `invalidate()`. Scroll and resize events recompute the visible window without rebuilding offsets.

## See Also

- [Buildit](/buildit/)
- [Craftit](/craftit/)
- [Dragit](/dragit/)
