---
title: Zero-Allocation Range Callback
description: Use onRangeChange to react to scroll position without allocating VirtualItem arrays.
---

# Zero-Allocation Range Callback

`onRangeChange(first, last)` fires on every visible-window change **before** `onChange`, without allocating a `VirtualItem[]`. Use it for analytics, prefetching, or infinite-scroll triggers when you don't need the full item layout.

## Only `onRangeChange` (zero allocation)

When `onChange` is omitted, `v.items` stays `[]` — the offset table is still maintained but no array is built:

```ts
import { createVirtualizer } from '@vielzeug/scroll';

const virt = createVirtualizer(scrollEl, {
  count: 10_000,
  estimateSize: 36,
  // No onChange → zero VirtualItem[] allocation on scroll
  onRangeChange(first, last) {
    prefetchRows(first, last);
  },
});

console.log(virt.items.length); // 0
```

## Alongside `onChange`

Both callbacks can coexist. `onRangeChange` fires first — use it for side-effects while `onChange` handles rendering:

```ts
import { createVirtualizer } from '@vielzeug/scroll';

createVirtualizer(scrollEl, {
  count: 10_000,
  estimateSize: 36,
  onChange({ items, totalSize }) {
    listEl.style.height = `${totalSize}px`;
    render(items);
  },
  onRangeChange(first, last) {
    // Fires before onChange — ideal for analytics/prefetch
    analytics.trackVisible(first, last);
  },
});
```

## Infinite scroll trigger

```ts
import { createVirtualizer } from '@vielzeug/scroll';

let loading = false;
let count = 50;

const virt = createVirtualizer(scrollEl, {
  count,
  estimateSize: 40,
  onChange: ({ items, totalSize }) => render(items, totalSize),
  onRangeChange: (_first, last) => {
    if (!loading && last >= count - 10) {
      loading = true;
      fetchMore().then((more) => {
        count += more.length;
        virt.update({ count });
        loading = false;
      });
    }
  },
});
```
