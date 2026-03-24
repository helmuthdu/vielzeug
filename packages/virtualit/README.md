# @vielzeug/virtualit

> Lightweight, framework-agnostic virtual list engine for DOM rendering layers

[![npm version](https://img.shields.io/npm/v/@vielzeug/virtualit)](https://www.npmjs.com/package/@vielzeug/virtualit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Virtualit** renders only the items visible in the viewport plus a configurable overscan buffer. It uses a `ResizeObserver` for automatic container remeasurement and a passive `scroll` listener to keep the visible window in sync — no framework required.

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
      row.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:${item.height}px;`;
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
- ✅ **Fixed and variable heights** — pass a number or a per-index estimator; call `measureElement()` for exact heights
- ✅ **Batched measurements** — `measureElement()` calls within a single tick are coalesced into one rebuild via `queueMicrotask`
- ✅ **Skipped re-renders** — `onChange` is not fired when a scroll event doesn't cross an item boundary
- ✅ **Programmatic scrolling** — `scrollToIndex()` with `start`, `end`, `center`, and `auto` alignment; `scrollToOffset()` for pixel-level control; both support `behavior: 'smooth'`
- ✅ **Reactive count and density** — `count` and `estimateSize` setters rebuild and re-render automatically
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
  overscan: 3,
  onChange: (virtualItems, totalSize) => {
    spacer.style.height = `${totalSize}px`;
    list.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${item.top}px;`;
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
      if (el) virt.measureElement(item.index, el.offsetHeight);
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

### Updating the List

```ts
// Append more items — setter rebuilds and re-renders automatically
virt.count = newItems.length;

// Switch row density (e.g. compact ↔ comfortable view)
virt.estimateSize = isDense ? 32 : 48;

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
export { Virtualizer, createVirtualizer } from '@vielzeug/virtualit';
export type { ScrollToIndexOptions, VirtualItem, VirtualizerOptions } from '@vielzeug/virtualit';
```

### `createVirtualizer(el, options)`

Creates and immediately attaches a `Virtualizer` to `el`.

| Parameter              | Type                                                | Description                                            |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `el`                   | `HTMLElement`                                       | The scroll container to observe                        |
| `options.count`        | `number`                                            | Total number of items                                  |
| `options.estimateSize` | `number \| (i: number) => number`                   | Row height estimate. Default: `36`                     |
| `options.overscan`     | `number`                                            | Items to render beyond the viewport edge. Default: `3` |
| `options.onChange`     | `(items: VirtualItem[], totalSize: number) => void` | Called whenever the visible range changes              |

Returns a `Virtualizer` instance.

### `Virtualizer`

| Member                      | Type                                      | Description                                        |
| --------------------------- | ----------------------------------------- | -------------------------------------------------- |
| `count`                     | `get/set number`                          | Item count; setting rebuilds and re-renders        |
| `estimateSize`              | `set number \| (i) => number`             | Update the size estimator; clears measured heights |
| `attach(el)`                | `(el: HTMLElement) => void`               | Attach (or re-attach) to a scroll container        |
| `destroy()`                 | `() => void`                              | Remove all listeners; idempotent                   |
| `[Symbol.dispose]()`        | —                                         | Delegates to `destroy()`                           |
| `getVirtualItems()`         | `() => VirtualItem[]`                     | Currently rendered items                           |
| `getTotalSize()`            | `() => number`                            | Total scrollable height in px                      |
| `measureElement(i, h)`      | `(index: number, height: number) => void` | Record an exact item height; batched per microtask |
| `scrollToIndex(i, opts?)`   | `(index, ScrollToIndexOptions) => void`   | Scroll to an item                                  |
| `scrollToOffset(px, opts?)` | `(offset, { behavior? }) => void`         | Scroll to a pixel offset                           |
| `invalidate()`              | `() => void`                              | Clear all measured heights and re-render           |

### `VirtualItem`

```ts
interface VirtualItem {
  index: number; // Position in the full list
  top: number; // Pixel offset from the top of the scroll area
  height: number; // Measured or estimated height
}
```

## Documentation

Full docs at **[vielzeug.dev/virtualit](https://vielzeug.dev/virtualit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/virtualit/usage) | Fixed/variable heights, overscan, scrolling |
| [API Reference](https://vielzeug.dev/virtualit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/virtualit/examples) | Real-world virtual list patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
