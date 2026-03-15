---
title: Virtualit — Examples
description: Real-world patterns for the Virtualit virtual list engine.
---

## Virtualit Examples

::: tip
These are copy-paste ready recipes. See the [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

## Basic Fixed-Height List

The simplest case: every row is the same height. The offset table is built once and never needs rebuilding.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const data = Array.from({ length: 50_000 }, (_, i) => ({ id: i, label: `Item ${i}` }));

const scrollEl = document.getElementById('scroll')!;
const listEl = document.getElementById('list')!;

const virt = createVirtualizer(scrollEl, {
  count: data.length,
  estimateSize: 40,
  onChange: (virtualItems, totalSize) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.className = 'row';
      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:40px;line-height:40px;padding:0 12px;`;
      el.textContent = data[item.index].label;
      listEl.appendChild(el);
    }
  },
});
```

```html
<div id="scroll" style="height:400px;overflow:auto;position:relative;">
  <div id="list" style="position:relative;"></div>
</div>
```

---

## Grouped List (Headers + Rows)

Flatten groups into a linear renderable list, then pass a per-index estimator to predict header vs. row heights.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

type FlatRow = { type: 'header'; label: string } | { type: 'row'; data: { id: number; name: string } };

const flatList: FlatRow[] = [
  { type: 'header', label: 'A' },
  { type: 'row', data: { id: 1, name: 'Alice' } },
  { type: 'row', data: { id: 2, name: 'Adam' } },
  { type: 'header', label: 'B' },
  { type: 'row', data: { id: 3, name: 'Bob' } },
];

const virt = createVirtualizer(scrollEl, {
  count: flatList.length,
  estimateSize: (i) => (flatList[i].type === 'header' ? 32 : 44),
  onChange: (virtualItems, totalSize) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    for (const item of virtualItems) {
      const row = flatList[item.index];
      const el = document.createElement('div');

      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;`;

      if (row.type === 'header') {
        el.className = 'group-header';
        el.style.height = '32px';
        el.textContent = row.label;
      } else {
        el.className = 'row';
        el.style.height = '44px';
        el.textContent = row.data.name;
      }

      listEl.appendChild(el);
    }
  },
});
```

---

## Variable Height with Measurement

Report exact heights after rendering using `measureElement()`. All measurement calls within a single tick are coalesced into one rebuild.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

type Message = { id: number; content: string };
const messages: Message[] = [
  /* ... */
];

const virt = createVirtualizer(scrollEl, {
  count: messages.length,
  estimateSize: 64, // rough estimate — actual heights vary
  onChange: (virtualItems, totalSize) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.dataset.index = String(item.index);
      el.className = 'message';
      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;padding:8px;`;
      el.textContent = messages[item.index].content;
      listEl.appendChild(el);
    }

    // Measure after layout — batched into one rebuild
    requestAnimationFrame(() => {
      for (const item of virtualItems) {
        const el = listEl.querySelector<HTMLElement>(`[data-index="${item.index}"]`);
        if (el) virt.measureElement(item.index, el.offsetHeight);
      }
    });
  },
});
```

---

## Infinite Scroll (Load More)

Detect when the user scrolls near the end and load the next page. Update `count` to append new items seamlessly.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const PAGE_SIZE = 50;
let items: string[] = Array.from({ length: PAGE_SIZE }, (_, i) => `Item ${i}`);
let loading = false;

async function loadMore() {
  if (loading) return;
  loading = true;
  await new Promise((r) => setTimeout(r, 500)); // simulate API call
  const start = items.length;
  items = [...items, ...Array.from({ length: PAGE_SIZE }, (_, i) => `Item ${start + i}`)];
  virt.count = items.length;
  loading = false;
}

const virt = createVirtualizer(scrollEl, {
  count: items.length,
  estimateSize: 40,
  onChange: (virtualItems, totalSize) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:40px;line-height:40px;padding:0 12px;`;
      el.textContent = items[item.index] ?? 'Loading…';
      listEl.appendChild(el);
    }

    // Trigger next page load when the last item is in view
    const lastRendered = virtualItems.at(-1);
    if (lastRendered && lastRendered.index >= items.length - 10) {
      loadMore();
    }
  },
});
```

---

## Keyboard Navigation

Track a focused index and use `scrollToIndex` with `align: 'auto'` so only out-of-view items trigger a scroll.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const rows = Array.from({ length: 1_000 }, (_, i) => `Row ${i}`);
let focusedIndex = 0;

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 36,
  onChange: (virtualItems, totalSize) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;height:36px;`;
      el.style.background = item.index === focusedIndex ? 'var(--highlight)' : '';
      el.textContent = rows[item.index];
      listEl.appendChild(el);
    }
  },
});

scrollEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    focusedIndex = Math.min(focusedIndex + 1, rows.length - 1);
    virt.scrollToIndex(focusedIndex, { align: 'auto' });
    virt.invalidate(); // re-render to update highlight
  } else if (e.key === 'ArrowUp') {
    focusedIndex = Math.max(focusedIndex - 1, 0);
    virt.scrollToIndex(focusedIndex, { align: 'auto' });
    virt.invalidate();
  }
});
```

---

## Restore Scroll Position

Save and restore scroll position using `scrollToOffset()`.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const STORAGE_KEY = 'list-scroll-offset';

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 40,
  onChange: render,
});

// Save offset as the user scrolls
scrollEl.addEventListener(
  'scroll',
  () => {
    sessionStorage.setItem(STORAGE_KEY, String(scrollEl.scrollTop));
  },
  { passive: true },
);

// Restore on page load
const saved = sessionStorage.getItem(STORAGE_KEY);
if (saved) virt.scrollToOffset(Number(saved));
```

---

## Density Toggle (Compact / Comfortable)

Use the `estimateSize` setter to switch between density modes. Measured heights from the previous mode are automatically cleared.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const DENSITY = { compact: 32, comfortable: 48 };
let mode: keyof typeof DENSITY = 'comfortable';

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: DENSITY[mode],
  onChange: render,
});

document.getElementById('toggle-density')!.addEventListener('click', () => {
  mode = mode === 'compact' ? 'comfortable' : 'compact';
  virt.estimateSize = DENSITY[mode];
});
```

---

## Using `Virtualizer` Directly (Without `createVirtualizer`)

Useful in component frameworks where the scroll container is not available at construction time.

```ts
import { Virtualizer } from '@vielzeug/virtualit';

// Build the instance when data is ready — no element needed yet
const virt = new Virtualizer({
  count: rows.length,
  estimateSize: 36,
  onChange: render,
});

// Attach once the component mounts
function onMount(scrollEl: HTMLElement) {
  virt.attach(scrollEl);
}

// The virtualizer can be re-attached to a new container
function onReopen(newScrollEl: HTMLElement) {
  virt.count = rows.length; // sync count before re-attaching
  virt.attach(newScrollEl);
}

function onDestroy() {
  virt.destroy();
}
```

---

## Explicit Resource Management (`using`)

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

function renderList(scrollEl: HTMLElement, rows: string[]) {
  using virt = createVirtualizer(scrollEl, {
    count: rows.length,
    estimateSize: 36,
    onChange: (virtualItems, totalSize) => {
      // render...
    },
  });

  // ... synchronous setup ...
} // virt.destroy() is called automatically here
```
