---
title: Scroll — Usage Guide
description: Fixed and variable heights, measurement, programmatic scrolling, and framework integration for Scroll.
---

[[toc]]

## Basic Usage

Render only visible rows by passing a scroll container, a total item count, and a size estimate. Scroll calls `onChange` with the visible window whenever it changes.

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
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:36px;`;
      el.textContent = `Row ${item.index}`;
      listEl.appendChild(el);
    }
  },
});

// Cleanup
virt.dispose();
```

```html
<div class="scroll-container" style="height:400px;overflow:auto;position:relative;">
  <div class="list" style="position:relative;"></div>
</div>
```

## DOM Layout Requirements

Scroll uses **absolute positioning** for rendered items inside a relative container that stretches to the full list height. Your HTML needs three elements:

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

## DOM Adapter for Dropdowns and Listboxes

If your component already has a dropdown scroll container and a listbox element, use `createDomVirtualList`. It wraps the `Virtualizer` lifecycle and keeps the integration surface small. Items arrive as `VirtualRenderItem<T>` — a `VirtualItem` enriched with a `.data` field. Use `recycle` for efficient DOM node reuse.

The virtualizer is created lazily on the first non-empty `setItems()` call and destroyed automatically when `setItems([])` is called (clearing list styles in the process).

```ts
import { createDomVirtualList } from '@vielzeug/scroll';

type Option = { disabled?: boolean; label: string; value: string };

let options: Option[] = [];

const domVirtualList = createDomVirtualList<Option>({
  estimateSize: 36,
  gap: 6,
  getItemKey: (_index, option) => option.value,
  listElement: listboxEl,
  overscan: { end: 4, start: 4 },
  render: ({ items, listEl, recycle }) => {
    for (const item of items) {
      const row = recycle(item.data.value, () => document.createElement('button'));
      row.type = 'button';
      row.className = 'option';
      row.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.start}px);height:${item.size}px;`;
      row.textContent = item.data.label;
      row.disabled = !!item.data.disabled;
      listEl.appendChild(row);
    }
  },
  scrollElement: dropdownEl,
});

// Keep in sync when options change
domVirtualList.setItems(options);

// Open: setItems populates the list
// Close: setItems([]) destroys the virtualizer and clears list styles
domVirtualList.setItems(isOpen ? options : []);

// Keyboard nav
domVirtualList.scrollToIndex(focusedIndex, { align: 'auto' });

// Component teardown
domVirtualList.dispose();
```

For variable-height rows, pass `getItemKey` so measurements survive `setItems()` calls when items reorder or are filtered.

When multiple sizes are available at once, use `measureBatch` to coalesce into a single rebuild:

```ts
domVirtualList.measureBatch(
  entries.map((e) => ({ index: Number(e.target.dataset.index), size: e.contentRect.height })),
);
```

Use `domVirtualList.invalidate()` to discard all cached measurements.

## Fixed Heights

Pass a single number to `estimateSize` when all rows are the same height. This is the simplest and most performant case — the offset table never needs to be rebuilt during scrolling.

```ts
const virt = createVirtualizer(scrollEl, {
  count: 10_000,
  estimateSize: 36, // every row is 36px
  onChange: ({ items, totalSize }) => {
    list.style.height = `${totalSize}px`;
    list.innerHTML = '';

    for (const item of items) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:36px;`;
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
  onChange: ({ items, totalSize }) => {
    // render...
  },
});
```

## Variable Heights — Measured

For truly dynamic heights (e.g. text wrapping, embedded images), render items at their estimated size first, then report the actual measured height with `measure()`. Scroll will coalesce all measurement calls within a single microtask tick into one offset rebuild.

```ts
const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 60, // initial estimate
  onChange: ({ items, totalSize }) => {
    list.style.height = `${totalSize}px`;
    list.innerHTML = '';

    for (const item of items) {
      const el = document.createElement('div');
      el.dataset.index = String(item.index);
      el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;`;
      el.innerHTML = rows[item.index].html;
      list.appendChild(el);
    }

    // Measure after the DOM has painted
    requestAnimationFrame(() => {
      for (const item of items) {
        const el = list.querySelector<HTMLElement>(`[data-index="${item.index}"]`);
        if (el) virt.measure(item.index, el.offsetHeight);
      }
    });
  },
});
```

::: tip Measurement is idempotent
`measure(index, height)` is a no-op when the new height matches the current effective height (measured or estimated). It is safe to call on every render without triggering unnecessary rebuilds.
:::

## Variable Heights — Batch Measurement

When a `ResizeObserver` fires with multiple entries at once, use `measureBatch()` to apply all sizes in a single offset rebuild instead of triggering one rebuild per `measure()` call.

```ts
const observer = new ResizeObserver((entries) => {
  virt.measureBatch(
    entries
      .filter((e) => e.target instanceof HTMLElement && e.target.dataset.index)
      .map((e) => ({
        index: Number((e.target as HTMLElement).dataset.index),
        size: e.contentRect.height,
      })),
  );
});

// Observe each rendered row
for (const item of virt.items) {
  const el = listEl.querySelector<HTMLElement>(`[data-index="${item.index}"]`);
  if (el) observer.observe(el);
}
```

## Overscan

`overscan` controls how many extra items render outside the visible viewport on each side. Higher values reduce the chance of blank rows during fast scrolling; lower values keep the DOM smaller.

```ts
createVirtualizer(scrollEl, {
  count: 1_000,
  estimateSize: 36,
  overscan: 5, // symmetric shorthand — same as { start: 5, end: 5 } (default: 3)
  onChange: () => {
    /* ... */
  },
});
```

Asymmetric overscan:

```ts
createVirtualizer(scrollEl, {
  count: 1_000,
  estimateSize: 36,
  overscan: { start: 8, end: 2 },
  onChange: () => {
    /* ... */
  },
});
```

## Horizontal Lists

Set `horizontal: true` to virtualize along the X axis.

```ts
const virt = createVirtualizer(scrollEl, {
  count: chips.length,
  estimateSize: 120,
  horizontal: true,
  onChange: ({ items, totalSize }) => {
    list.style.width = `${totalSize}px`;

    for (const item of items) {
      const chip = document.createElement('button');
      chip.style.cssText = `position:absolute;left:${item.start}px;top:0;width:${item.size}px;`;
      chip.textContent = chips[item.index].label;
      list.appendChild(chip);
    }
  },
});
```

## Window Scroll Target

`createVirtualizer` accepts `window` as the scroll target.

```ts
const virt = createVirtualizer(window, {
  count: rows.length,
  estimateSize: 40,
  initialOffset: 320,
  onChange: ({ items, totalSize }) => {
    spacer.style.height = `${totalSize}px`;
    renderRows(items);
  },
});
```

## Scroll State

Use `virt.scrollOffset` to read the current scroll position at any time.

```ts
const virt = createVirtualizer(scrollEl, { count: rows.length, estimateSize: 36, onChange: render });

// Accessed outside onChange
console.log(virt.scrollOffset);
```

## Updating Options

When your data or render strategy changes, call `update()` with one or more option fields. Updates are applied atomically and trigger re-render when needed.

```ts
// Load more data
data.push(...newItems);
virt.update({ count: data.length });
```

```ts
// Change multiple options together
virt.update({ count: data.length, overscan: { start: 5, end: 5 } });

// Rebuild after reordering/filtering stable-key rows
virt.refresh();
```

## Switching Row Density

Updating `estimateSize` clears all previously measured heights, rebuilds offsets, and re-renders. This makes density switching (compact / comfortable / spacious views) straightforward.

```ts
function setDensity(mode: 'compact' | 'comfortable') {
  virt.update({ estimateSize: mode === 'compact' ? 32 : 48 });
}
```

## Programmatic Scrolling

### `scrollToIndex(index, options?)`

Scroll to bring a specific item into view.

| `align`            | Behaviour                                                                |
| ------------------ | ------------------------------------------------------------------------ |
| `'start'`          | Item top aligns with the container top                                   |
| `'end'`            | Item bottom aligns with the container bottom                             |
| `'center'`         | Item is centered in the viewport                                         |
| `'auto'` (default) | No scroll if already fully visible; otherwise scrolls the minimum amount |

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

### `scrollToTop(options?)` / `scrollToBottom(options?)`

Convenience wrappers to jump directly to the start or end of the list.

```ts
// Jump to the top
virt.scrollToTop();

// Jump to the bottom with smooth scroll
virt.scrollToBottom({ behavior: 'smooth' });
```

## Shared Measurement Cache

When the same items are displayed across multiple virtualizer instances (e.g. a list and a detail panel that share row heights), pass a shared `MeasurementCache` created by `createMeasurementCache()`. Measurements recorded by one virtualizer are immediately available to all others using the same cache.

```ts
import { createMeasurementCache, createVirtualizer } from '@vielzeug/scroll';

const cache = createMeasurementCache();

const listVirt = createVirtualizer(listScrollEl, {
  count: rows.length,
  estimateSize: 36,
  measurementCache: cache,
  onChange: renderList,
});

const previewVirt = createVirtualizer(previewScrollEl, {
  count: rows.length,
  estimateSize: 36,
  measurementCache: cache,
  onChange: renderPreview,
});

// A measurement on listVirt is reflected in previewVirt immediately.
listVirt.measure(0, 72);
```

The cache is a plain `Map<VirtualKey, number>` — you can pre-populate it from server data or persist it across sessions.

```ts
// Pre-populate from server-sent sizes
const cache = createMeasurementCache();
for (const { id, height } of serverSizes) cache.set(id, height);
```

## Invalidating Measurements

Call `invalidate()` after an event that changes item heights without a data change — for example, a font load, a viewport width change that causes text to reflow, or toggling between a grid and list layout.

```ts
document.fonts.ready.then(() => virt.invalidate());
```

On variable-height lists, `scrollToIndex()` uses the current estimate/measured cache. If you need an exact post-layout position after heights change, call `invalidate()` before scrolling again.

For same-length updates, call `setItems()` (DOM adapter) or `update()` (core). If the rendered height of rows changed, call `invalidate()` before scrolling again.

## Lifecycle — create and dispose

`createVirtualizer(el, options)` attaches immediately to the provided scroll container. If your container is replaced, dispose the old instance and create a new one.

```ts
let virt = createVirtualizer(scrollContainerEl, {
  count: rows.length,
  estimateSize: 36,
  onChange: render,
});

function remount(nextScrollContainerEl: HTMLElement) {
  virt.dispose();
  virt = createVirtualizer(nextScrollContainerEl, {
    count: rows.length,
    estimateSize: 36,
    onChange: render,
  });
}
```

`dispose()` is idempotent and safe to call multiple times.

### Explicit Resource Management

```ts
// The `using` keyword calls virt.dispose() automatically at block exit
{
  using virt = createVirtualizer(scrollEl, { count: rows.length, onChange: render });
  // ... use virt ...
} // → virt.dispose() called here
```

## Framework Integration

Scroll is rendering-layer agnostic. The pattern is always the same: create the virtualizer when your scroll container is mounted, re-render your DOM in `onChange`, and call `dispose()` on unmount.

::: code-group

```tsx [React]
import { createVirtualizer, type Virtualizer } from '@vielzeug/scroll';
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
      onChange: ({ items, totalSize }) => {
        listEl.style.height = `${totalSize}px`;
        listEl.innerHTML = '';
        for (const item of items) {
          const el = document.createElement('div');
          el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:36px;`;
          el.textContent = rows[item.index]?.label ?? '';
          listEl.appendChild(el);
        }
      },
    });
    virtRef.current = virt;
    return () => virt.dispose();
  }, []); // attach once

  useEffect(() => {
    virtRef.current?.update({ count: rows.length });
  }, [rows.length]);

  return (
    <div ref={scrollRef} style={{ height: 400, overflow: 'auto', position: 'relative' }}>
      <div ref={listRef} style={{ position: 'relative' }} />
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createVirtualizer, type Virtualizer } from '@vielzeug/scroll';
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
    onChange: ({ items, totalSize }) => {
      listEl.style.height = `${totalSize}px`;
      listEl.innerHTML = '';
      for (const item of items) {
        const el = document.createElement('div');
        el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:36px;`;
        el.textContent = props.rows[item.index]?.label ?? '';
        listEl.appendChild(el);
      }
    },
  });
});
watch(
  () => props.rows.length,
  (n) => {
    virt?.update({ count: n });
  },
);
onUnmounted(() => virt?.dispose());
</script>

<template>
  <div ref="scrollRef" style="height:400px;overflow:auto;position:relative;">
    <div ref="listRef" style="position:relative;" />
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createVirtualizer, type Virtualizer } from '@vielzeug/scroll';

  let { rows }: { rows: { id: number; label: string }[] } = $props();
  let scrollEl: HTMLElement;
  let listEl: HTMLElement;
  let virt: Virtualizer;

  $effect(() => {
    virt = createVirtualizer(scrollEl, {
      count: rows.length,
      estimateSize: 36,
      onChange: ({ items, totalSize }) => {
        listEl.style.height = `${totalSize}px`;
        listEl.innerHTML = '';
        for (const item of items) {
          const el = document.createElement('div');
          el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:36px;`;
          el.textContent = rows[item.index]?.label ?? '';
          listEl.appendChild(el);
        }
      },
    });
    return () => virt.dispose();
  });

  $effect(() => { virt?.update({ count: rows.length }); });
</script>

<div bind:this={scrollEl} style="height:400px;overflow:auto;position:relative;">
  <div bind:this={listEl} style="position:relative;" />
</div>
```

```ts [Web Components]
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createVirtualizer, type Virtualizer } from '@vielzeug/scroll';

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
      onChange: ({ items, totalSize }) => {
        listEl.style.height = `${totalSize}px`;
        listEl.innerHTML = '';
        for (const item of items) {
          const el = document.createElement('div');
          el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:36px;`;
          el.textContent = this.rows[item.index]?.label ?? '';
          listEl.appendChild(el);
        }
      },
    });
  }

  updated() {
    this.#virt?.update({ count: this.rows.length });
  }
  disconnectedCallback() {
    this.#virt?.dispose();
    super.disconnectedCallback();
  }
  render() {
    return html`<div class="scroll"><div class="list"></div></div>`;
  }
}
```

:::

### Pitfalls

- **React:** Putting `rows` in the `useEffect` dependency array causes the virtualizer to be destroyed and recreated on every data update. Only include the scroll element reference. Call `virt.update({ count })` from a separate `useEffect` for data changes.
- **Vue 3:** `ref.value` is `null` inside `setup()` — the DOM doesn't exist yet. Always create the virtualizer inside `onMounted`, not in `setup()`.
- **Svelte:** In Svelte 5, `$effect` with `bind:this` runs after the DOM is painted. The `bind:this` variable is available when the `$effect` runs — no extra tick needed.
- **Web Components:** `firstUpdated` fires once after the first render. Use `updated()` for subsequent prop changes — Lit calls it every time `rows` changes.

## Working with Other Vielzeug Libraries

### With Ore

Build a virtualizing custom element using Ore for the component shell and Scroll for the rendering engine.

```ts
import { define, html, onMounted, ref } from '@vielzeug/ore';
import { createVirtualizer } from '@vielzeug/scroll';

define('virtual-list', {
  setup() {
    const scrollRef = ref<HTMLElement>();
    const listRef = ref<HTMLElement>();

    onMounted(() => {
      if (!scrollRef.value || !listRef.value) return;
      const listEl = listRef.value;
      const virt = createVirtualizer(scrollRef.value, {
        count: 1000,
        estimateSize: 40,
        onChange: ({ items, totalSize }) => {
          listEl.style.height = `${totalSize}px`;
          listEl.innerHTML = items.map((i) => `<div style="position:absolute;top:${i.start}px;height:40px;">Row ${i.index}</div>`).join('');
        },
        },
        },
      });
      return () => virt.dispose();
    });

    return () => html`
      <div ref=${scrollRef} style="height:400px;overflow:auto;position:relative">
        <div ref=${listRef} style="position:relative"></div>
      </div>
    `;
  },
});
```

## Best Practices

- Always provide `count` and `estimateSize` as a starting point, even for variable-height lists — measurements refine the estimates.
- Call `dispose()` in the framework cleanup callback (useEffect return, onUnmounted, onDestroy) to free resize observers.
- Use `overscan` to pre-render rows above and below the visible area to reduce blank flicker during fast scrolling.
- Prefer `scrollToIndex()` with `align: 'start'` for programmatic navigation; use `align: 'center'` for focus management.
- Use `createDomVirtualList()` for comboboxes, listboxes, and selects — it manages the virtualizer lifecycle and DOM node pooling for you.
- Invalidate measurements with `invalidate()` when item content changes size (e.g., after expanding an accordion row).
- For very large lists (>100k items), set a narrower `overscan` to limit DOM node count at any one time.
- Use `refresh()` when item data or sizes may have changed; it rebuilds the offset table and re-emits.
