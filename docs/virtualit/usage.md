---
title: Virtualit — Usage Guide
description: Fixed and variable heights, measurement, programmatic scrolling, and framework integration for Virtualit.
---

## Virtualit Usage Guide

::: tip New to Virtualit?
Start with the [Overview](./index.md) for installation and a quick introduction, then come back here for in-depth patterns.
:::

[[toc]]

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

| Feature            | Virtualit                                       | TanStack Virtual | react-window  |
| ------------------ | ----------------------------------------------- | ---------------- | ------------- |
| Bundle size        | <PackageInfo package="virtualit" type="size" /> | ~4 kB            | ~6 kB         |
| Framework agnostic | ✅                                              | ✅               | React only    |
| Variable heights   | ✅ Measured                                     | ✅               | ⚠️ Static     |
| O(log n) lookup    | ✅                                              | ✅               | ✅            |
| `using` support    | ✅                                              | ❌               | ❌            |
| Zero dependencies  | ✅                                              | ✅               | ✅            |

**Use Virtualit when** you need to render large lists in a framework-agnostic environment with precise control over item measurement and scroll position.

**Consider TanStack Virtual** if you need its React/Vue/Solid adapters, horizontal virtualisation, or window-based (not container-based) virtualisation.

## Import

```ts
import { createVirtualizer, Virtualizer } from '@vielzeug/virtualit';
// Types
import type { VirtualItem, VirtualizerOptions, ScrollToIndexOptions } from '@vielzeug/virtualit';
```

## DOM Layout Requirements

Virtualit uses **absolute positioning** for rendered items inside a relative container that stretches to the full list height. Your HTML needs three elements:

```html
<!-- 1. Scroll container — has a fixed height and overflow:auto/scroll -->
<div class="scroll-container" style="height:400px;overflow:auto;position:relative;">
  <!-- 2. Spacer — height set to totalSize so the scrollbar is correct -->
  <div class="spacer" style="position:relative;">
    <!-- 3. Item container — items positioned absolutely inside here -->
    <div class="items"></div>
  </div>
</div>
```

A common alternative is to make the spacer and item container the same element:

```html
<div class="scroll-container" style="height:400px;overflow:auto;">
  <!-- Single relative container; items are absolute children -->
  <div class="list" style="position:relative;"></div>
</div>
```

## Fixed Heights

Pass a single number to `estimateSize` when all rows are the same height. This is the simplest and most performant case — the offset table never needs to be rebuilt during scrolling.

```ts
const virt = createVirtualizer(scrollEl, {
  count: 10_000,
  estimateSize: 36, // every row is 36px
  onChange: (virtualItems, totalSize) => {
    list.style.height = `${totalSize}px`;
    list.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:36px;`;
      el.textContent = data[item.index].name;
      list.appendChild(el);
    }
  },
});
```

## Variable Heights — Estimator

Pass a **per-index function** to `estimateSize` when rows have predictable but non-uniform heights (e.g. group headers vs. regular rows). The offset table is built once at attach time using these estimates.

```ts
const virt = createVirtualizer(scrollEl, {
  count: flatList.length,
  estimateSize: (i) => (flatList[i].type === 'header' ? 48 : 36),
  onChange: (virtualItems, totalSize) => {
    // render...
  },
});
```

## Variable Heights — Measured

For truly dynamic heights (e.g. text wrapping, embedded images), render items at their estimated size first, then report the actual measured height with `measureElement()`. Virtualit will coalesce all measurement calls within a single microtask tick into one offset rebuild.

```ts
const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 60, // initial estimate
  onChange: (virtualItems, totalSize) => {
    list.style.height = `${totalSize}px`;
    list.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.dataset.index = String(item.index);
      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;`;
      el.innerHTML = rows[item.index].html;
      list.appendChild(el);
    }

    // Measure after the DOM has painted
    requestAnimationFrame(() => {
      for (const item of virtualItems) {
        const el = list.querySelector<HTMLElement>(`[data-index="${item.index}"]`);
        if (el) virt.measureElement(item.index, el.offsetHeight);
      }
    });
  },
});
```

::: tip Measurement is idempotent
`measureElement(index, height)` is a no-op when the new height matches the current effective height (measured or estimated). It is safe to call on every render without triggering unnecessary rebuilds.
:::

## Overscan

`overscan` controls how many extra items render outside the visible viewport on each side. Higher values reduce the chance of blank rows during fast scrolling; lower values keep the DOM smaller.

```ts
createVirtualizer(scrollEl, {
  count: 1_000,
  estimateSize: 36,
  overscan: 5, // render 5 extra items above and below the visible window (default: 3)
  onChange: () => {
    /* ... */
  },
});
```

## Updating the Count

When your data array grows or shrinks, assign to the `count` setter. The offset table is rebuilt and `onChange` fires immediately.

```ts
// Load more data
data.push(...newItems);
virt.count = data.length;
```

## Switching Row Density

Assigning `estimateSize` clears all previously measured heights, rebuilds offsets, and re-renders. This makes density switching (compact / comfortable / spacious views) a one-liner.

```ts
function setDensity(mode: 'compact' | 'comfortable') {
  virt.estimateSize = mode === 'compact' ? 32 : 48;
}
```

## Programmatic Scrolling

### `scrollToIndex(index, options?)`

Scroll to bring a specific item into view.

| `align`             | Behaviour                                                                |
| ------------------- | ------------------------------------------------------------------------ |
| `'start'` (default) | Item top aligns with the container top                                   |
| `'end'`             | Item bottom aligns with the container bottom                             |
| `'center'`          | Item is centered in the viewport                                         |
| `'auto'`            | No scroll if already fully visible; otherwise scrolls the minimum amount |

```ts
// Jump to item 500 at the top of the viewport
virt.scrollToIndex(500, { align: 'start' });

// Smooth-scroll to an item, centering it
virt.scrollToIndex(500, { align: 'center', behavior: 'smooth' });

// Scroll only if the item is not already visible
virt.scrollToIndex(focusedIndex, { align: 'auto' });
```

Out-of-range indices are clamped silently: negative values scroll to item `0`, values ≥ `count` scroll to the last item.

### `scrollToOffset(offset, options?)`

Scroll to an exact pixel position, useful for restoring a previously saved scroll state.

```ts
// Restore scroll position
const savedOffset = sessionStorage.getItem('scrollOffset');
if (savedOffset) virt.scrollToOffset(Number(savedOffset));

// Save on scroll
scrollEl.addEventListener('scroll', () => {
  sessionStorage.setItem('scrollOffset', String(scrollEl.scrollTop));
});
```

## Invalidating Measurements

Call `invalidate()` after an event that changes item heights without a data change — for example, a font load, a viewport width change that causes text to reflow, or toggling between a grid and list layout.

```ts
document.fonts.ready.then(() => virt.invalidate());
```

## Lifecycle — attach and destroy

`createVirtualizer(el, options)` attaches immediately. For cases where the scroll container is not available at construction time (e.g. a web component with a lazy shadow root), use the `Virtualizer` class directly:

```ts
import { Virtualizer } from '@vielzeug/virtualit';

// Create without attaching
const virt = new Virtualizer({
  count: rows.length,
  estimateSize: 36,
  onChange: render,
});

// Later, once the element is mounted:
virt.attach(scrollContainerEl);

// To re-attach to a different element (e.g. dropdown re-mount):
virt.attach(newScrollEl);

// Teardown
virt.destroy();
```

`destroy()` is idempotent — safe to call multiple times or when the element has already been removed from the DOM.

### Explicit Resource Management

```ts
// The `using` keyword calls virt.destroy() automatically at block exit
{
  using virt = createVirtualizer(scrollEl, { count: rows.length, onChange: render });
  // ... use virt ...
} // → virt.destroy() called here
```

## Framework Integration

Virtualit is rendering-layer agnostic. The pattern is always the same: create the virtualizer when your scroll container is mounted, re-render your DOM in `onChange`, and call `destroy()` on unmount.

### React

```tsx
import { createVirtualizer, type Virtualizer } from '@vielzeug/virtualit';
import { useEffect, useRef } from 'react';

interface Row {
  id: number;
  label: string;
}

function VirtualList({ rows }: { rows: Row[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const virtRef = useRef<Virtualizer | null>(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const listEl = listRef.current;

    if (!scrollEl || !listEl) return;

    const virt = createVirtualizer(scrollEl, {
      count: rows.length,
      estimateSize: 36,
      onChange: (virtualItems, totalSize) => {
        listEl.style.height = `${totalSize}px`;
        listEl.innerHTML = '';

        for (const item of virtualItems) {
          const el = document.createElement('div');
          el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:36px;`;
          el.textContent = rows[item.index]?.label ?? '';
          listEl.appendChild(el);
        }
      },
    });

    virtRef.current = virt;

    return () => virt.destroy();
  }, []); // attach once

  // When rows change, update the count
  useEffect(() => {
    if (virtRef.current) virtRef.current.count = rows.length;
  }, [rows.length]);

  return (
    <div ref={scrollRef} style={{ height: 400, overflow: 'auto', position: 'relative' }}>
      <div ref={listRef} style={{ position: 'relative' }} />
    </div>
  );
}
```

### Vue 3

```vue
<script setup lang="ts">
import { createVirtualizer, type Virtualizer } from '@vielzeug/virtualit';
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{ rows: { id: number; label: string }[] }>();

const scrollRef = ref<HTMLElement | null>(null);
const listRef = ref<HTMLElement | null>(null);
let virt: Virtualizer | null = null;

onMounted(() => {
  if (!scrollRef.value || !listRef.value) return;

  const listEl = listRef.value;

  virt = createVirtualizer(scrollRef.value, {
    count: props.rows.length,
    estimateSize: 36,
    onChange: (virtualItems, totalSize) => {
      listEl.style.height = `${totalSize}px`;
      listEl.innerHTML = '';

      for (const item of virtualItems) {
        const el = document.createElement('div');
        el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:36px;`;
        el.textContent = props.rows[item.index]?.label ?? '';
        listEl.appendChild(el);
      }
    },
  });
});

watch(
  () => props.rows.length,
  (n) => {
    if (virt) virt.count = n;
  },
);

onUnmounted(() => virt?.destroy());
</script>

<template>
  <div ref="scrollRef" style="height:400px;overflow:auto;position:relative;">
    <div ref="listRef" style="position:relative;" />
  </div>
</template>
```

### Svelte 5

```svelte
<script lang="ts">
  import { createVirtualizer, type Virtualizer } from '@vielzeug/virtualit';

  let { rows }: { rows: { id: number; label: string }[] } = $props();

  let scrollEl: HTMLElement;
  let listEl: HTMLElement;
  let virt: Virtualizer;

  $effect(() => {
    virt = createVirtualizer(scrollEl, {
      count: rows.length,
      estimateSize: 36,
      onChange: (virtualItems, totalSize) => {
        listEl.style.height = `${totalSize}px`;
        listEl.innerHTML = '';

        for (const item of virtualItems) {
          const el = document.createElement('div');
          el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:36px;`;
          el.textContent = rows[item.index]?.label ?? '';
          listEl.appendChild(el);
        }
      },
    });

    return () => virt.destroy();
  });

  $effect(() => {
    if (virt) virt.count = rows.length;
  });
</script>

<div bind:this={scrollEl} style="height:400px;overflow:auto;position:relative;">
  <div bind:this={listEl} style="position:relative;" />
</div>
```

### Lit / Web Components

```ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createVirtualizer, type Virtualizer } from '@vielzeug/virtualit';

@customElement('virtual-list')
class VirtualList extends LitElement {
  static styles = css`
    .scroll {
      height: 400px;
      overflow: auto;
      position: relative;
    }
    .list {
      position: relative;
    }
  `;

  @property({ type: Array }) rows: { label: string }[] = [];

  #virt: Virtualizer | null = null;

  firstUpdated() {
    const scrollEl = this.renderRoot.querySelector<HTMLElement>('.scroll')!;
    const listEl = this.renderRoot.querySelector<HTMLElement>('.list')!;

    this.#virt = createVirtualizer(scrollEl, {
      count: this.rows.length,
      estimateSize: 36,
      onChange: (virtualItems, totalSize) => {
        listEl.style.height = `${totalSize}px`;
        listEl.innerHTML = '';

        for (const item of virtualItems) {
          const el = document.createElement('div');
          el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:36px;`;
          el.textContent = this.rows[item.index]?.label ?? '';
          listEl.appendChild(el);
        }
      },
    });
  }

  updated() {
    if (this.#virt) this.#virt.count = this.rows.length;
  }

  disconnectedCallback() {
    this.#virt?.destroy();
    super.disconnectedCallback();
  }

  render() {
    return html`
      <div class="scroll">
        <div class="list"></div>
      </div>
    `;
  }
}
```
