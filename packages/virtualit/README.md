# @vielzeug/virtualit

> Lightweight, framework-agnostic virtual list engine for DOM rendering layers

[![npm version](https://img.shields.io/npm/v/@vielzeug/virtualit)](https://www.npmjs.com/package/@vielzeug/virtualit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Virtualit** renders only the items visible in the viewport plus a configurable overscan buffer. It uses a `ResizeObserver` for container size changes and a passive `scroll` listener to keep the visible window in sync — no framework required.

## Installation

```sh
pnpm add @vielzeug/virtualit
# npm install @vielzeug/virtualit
# yarn add @vielzeug/virtualit
```

## Quick Start

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const scrollEl = document.querySelector<HTMLElement>('.scroll-container')!;

const virt = createVirtualizer(scrollEl, {
  count: items.length,
  estimateSize: 36,
  onChange: (virtualItems, totalSize) => {
    spacer.style.height = `${totalSize}px`;
    list.innerHTML = '';

    for (const item of virtualItems) {
      const row = document.createElement('div');
      row.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:${item.size}px;`;
      row.textContent = items[item.index].label;
      list.appendChild(row);
    }
  },
});

// Later:
virt.destroy();
```

## Features

- ✅ **Framework-agnostic** — callback-based `onChange`; works with React, Vue, Svelte, Lit, or vanilla DOM
- ✅ **Fixed and variable sizes** — pass a number or a per-index estimator; call `measure()` for exact size capture
- ✅ **Batched measurements** — measurement calls within a single tick are coalesced into one rebuild via `queueMicrotask`
- ✅ **Stable-key reflow** — `refresh()` rebuilds offsets after reorder/filter changes without discarding measured sizes
- ✅ **Skipped re-renders** — `onChange` is not fired when a scroll event doesn't cross an item boundary
- ✅ **Programmatic scrolling** — `scrollToIndex()` with `start`, `end`, `center`, and `auto` alignment; `scrollToOffset()` for pixel-level control; both support `behavior: 'smooth'`; variable-height lists use current estimates until rows are measured
- ✅ **Atomic updates** — `update()` can change count, estimator, overscan, callbacks, and scroll behavior config together
- ✅ **Horizontal and window targets** — supports horizontal virtualization and `window` as scroll target
- ✅ **Asymmetric overscan and gaps** — control start/end overscan independently and set inter-item spacing
- ✅ **Typed Float64Array offsets** — dense contiguous buffer for cache-friendly binary search
- ✅ **Disposable** — implements `[Symbol.dispose]` for `using` declarations
- ✅ **Zero dependencies**

## Usage

### Vanilla DOM

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const scrollEl = document.getElementById('scroll')!;
const spacer = document.getElementById('spacer')!;
const list = document.getElementById('list')!;

const virt = createVirtualizer(scrollEl, {
  count: 10_000,
  estimateSize: 36,
  overscan: { start: 3, end: 3 },
  onChange: (virtualItems, totalSize) => {
    spacer.style.height = `${totalSize}px`;
    list.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.dataset.index = String(item.index);
      el.style.cssText = `position:absolute;top:${item.start}px;`;
      el.textContent = `Row ${item.index}`;
      list.appendChild(el);
    }
  },
});
```

### Variable Heights

```ts
const virt = createVirtualizer(scrollEl, {
  count: items.length,
  estimateSize: (i) => (items[i].isHeader ? 48 : 36),
  onChange: (virtualItems, totalSize) => {
    // render items...

    // After rendering, report the actual measured heights
    for (const item of virtualItems) {
      const el = list.querySelector(`[data-index="${item.index}"]`) as HTMLElement | null;
      if (el) virt.measure(item.index, el.offsetHeight);
    }
  },
});
```

### Programmatic Scroll

```ts
// Jump to item 200, centered in viewport
virt.scrollToIndex(200, { align: 'center' });

// Smooth scroll to item 50
virt.scrollToIndex(50, { align: 'start', behavior: 'smooth' });

// Scroll to a known pixel offset
virt.scrollToOffset(1440, { behavior: 'smooth' });
```

For variable-height lists, `scrollToIndex()` uses the current estimate/measured cache. If row sizes changed materially, call `invalidate()` and then scroll again.

If the same logical rows were reordered or filtered while keeping stable keys, call `refresh()` to rebuild offsets without dropping measured sizes.

### Updating the List

```ts
// Append more items
virt.update({ count: newItems.length });

// Switch row density (e.g. compact ↔ comfortable view)
virt.update({ estimateSize: isDense ? 32 : 48 });

// Rebuild after reordering stable-key rows
virt.refresh();

// Recompute after a font swap or layout shift
virt.invalidate();
```

### Explicit Resource Management

```ts
// `using` automatically calls virt.destroy() when the block exits
{
  using virt = createVirtualizer(scrollEl, { count: 100 });
}
```

## API

### Package Exports

```ts
export { createVirtualizer } from '@vielzeug/virtualit';
export type {
  Overscan,
  ScrollToIndexOptions,
  VirtualItem,
  Virtualizer,
  VirtualizerOptions,
  VirtualizerUpdateOptions,
} from '@vielzeug/virtualit';
```

### `createVirtualizer(el, options)`

Creates and immediately attaches a `Virtualizer` to `el`.

- `el`: `HTMLElement | Window` — the scroll target to observe.
- `options.count`: `number` — total number of items.
- `options.estimateSize`: `number | (i: number) => number` — row size estimate (default: `36`).
- `options.gap`: `number` — gap in px inserted between items.
- `options.overscan`: `{ start?: number; end?: number }` — items rendered beyond viewport edge (default: `{ start: 3, end: 3 }`).
- `options.onChange`: `(items: VirtualItem[], totalSize: number) => void` — called whenever the visible range changes.

Returns a `Virtualizer` instance.

### `Virtualizer`

- `count`: `readonly number` — current item count.
- `estimateSize`: `readonly number | (i) => number` — active estimator.
- `update(next)`: `(next: VirtualizerUpdateOptions) => void` — atomically update options.
- `destroy()`: `() => void` — remove all listeners; idempotent.
- `[Symbol.dispose]()` — delegates to `destroy()`.
- `items`: `readonly VirtualItem[]` — currently rendered items.
- `totalSize`: `readonly number` — total scrollable size in px.
- `scrollOffset`: `readonly number` — current scroll offset.
- `isScrolling`: `readonly boolean` — true while in active scrolling window.
- `measure(i, h)`: `(index: number, size: number) => void` — record exact item size; batched per microtask.
- `refresh()`: `() => void` — rebuild offsets and re-render while keeping measured sizes.
- `scrollToIndex(i, opts?)`: `(index, ScrollToIndexOptions) => void` — scroll to an item.
- `scrollToOffset(px, opts?)`: `(offset, { behavior? }) => void` — scroll to a pixel offset.
- `invalidate()`: `() => void` — clear measured sizes and re-render.

### `VirtualItem`

```ts
interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}
```

## Documentation

Full docs at **[vielzeug.dev/virtualit](https://vielzeug.dev/virtualit)**

- [Usage Guide](https://vielzeug.dev/virtualit/usage) — fixed/variable heights, overscan, scrolling.
- [API Reference](https://vielzeug.dev/virtualit/api) — complete type signatures.
- [Examples](https://vielzeug.dev/virtualit/examples) — real-world virtual list patterns.

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
