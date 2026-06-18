---
title: 'Scroll Examples — Infinite Scroll'
description: 'Infinite scroll example for @vielzeug/scroll.'
---

## Infinite Scroll

### Problem

You want to detect when the user nears the end of a virtual list and load more data. The `onChange` callback receives the current visible item range on every render, making it the natural place to trigger loads.

### Solution

Use `virt.update({ count })` to extend the list after fetching. Check the last visible index in `onChange` to decide when to load.

```ts
import { createVirtualizer } from '@vielzeug/scroll';

let loading = false;
let count = 50;

const virt = createVirtualizer(scrollEl, {
  count,
  estimateSize: 40,
  onChange: ({ items, totalSize }) => {
    render(items, totalSize);

    const last = items.at(-1)?.index ?? -1;

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

#### Analytics and prefetch

Read the first and last rendered indices in `onChange` without any extra state:

```ts
createVirtualizer(scrollEl, {
  count: 10_000,
  estimateSize: 36,
  onChange({ items, totalSize }) {
    listEl.style.height = `${totalSize}px`;
    render(items);

    const first = items[0]?.index ?? -1;
    const last = items.at(-1)?.index ?? -1;

    if (first >= 0) {
      analytics.trackVisible(first, last);
      prefetchRows(first, last);
    }
  },
});
```

### Pitfalls

- Set a `loading` flag before the async call to prevent concurrent fetches while the previous one is in-flight.
- `virt.update({ count })` only extends the list; call `virt.refresh()` if items are replaced rather than appended.

### Related

- [Basic Fixed Height List](./basic-fixed-height-list.md)
- [Restore Scroll Position](./restore-scroll-position.md)
