---
title: Virtualit — Virtual list engine for TypeScript
description: Lightweight, framework-agnostic virtual list engine with variable heights, smooth scrolling, and zero dependencies.
---

<PackageBadges package="virtualit" />

<img src="/logo-virtualit.svg" alt="Virtualit Logo" width="156" class="logo-highlight"/>

# Virtualit

**Virtualit** is a framework-agnostic virtual list engine. It renders only the items visible in the viewport plus a configurable overscan buffer, keeping the DOM small regardless of how many items are in your dataset.

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

## How It Works

Virtualit maintains a `Float64Array` prefix-sum of item offsets. On every scroll event it runs two binary searches — one for the first visible index, one for the last — to determine the render window in O(log n) time. Only the items within that window (plus `overscan` on each side) are passed to `onChange`.

```
Items:    [0]  [1]  [2]  [3]  [4]  [5]  [6]  ...
Offsets:   0   36   72  108  144  180  216  ...

scrollTop = 90, containerHeight = 120 → visible items 2–5
With overscan=3: render items 0–8
```

The offset array is rebuilt (O(n)) only when item heights change: on `measureElement()` flush, `count` change, `estimateSize` change, or `invalidate()`. Scroll and resize events recompute the visible window without rebuilding offsets.
