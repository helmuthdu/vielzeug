---
title: 'Sourcerer Examples — Reactive Controls with Ripple'
description: 'Drive a Sourcerer model from Ripple signals so multiple UI controls stay in sync automatically.'
---

## Reactive Controls with Ripple

### Problem

Multiple UI elements — a search input, a role filter dropdown, a sort toggle — all control the same list. Without shared state, each control needs its own callback wired to the source, and keeping them in sync requires threading state manually.

### Solution

Store filter, search, and sort settings in a Ripple `store` and use `effect()` to project them into the source whenever any value changes.

```ts
import { effect, store } from '@vielzeug/ripple';
import { createLocalSource, sortBy } from '@vielzeug/sourcerer';

type User = { id: number; name: string; role: 'admin' | 'member' };

const users: User[] = [
  { id: 1, name: 'Ada Lovelace', role: 'admin' },
  { id: 2, name: 'Grace Hopper', role: 'admin' },
  { id: 3, name: 'Linus Torvalds', role: 'member' },
  { id: 4, name: 'Margaret Hamilton', role: 'member' },
];

const source = createLocalSource(users, { limit: 2 });

const controls = store({
  query: '',
  role: 'all' as 'all' | 'admin' | 'member',
  sort: 'name' as 'name' | 'role',
});

// Reactively project shared UI state into the source model
effect(() => {
  source.batch((ctx) => {
    ctx.search(controls.value.query);
    ctx.setFilter(
      controls.value.role === 'all'
        ? undefined
        : (user) => user.role === controls.value.role,
    );
    ctx.setSort(
      controls.value.sort === 'name'
        ? sortBy((u) => u.name, 'asc')
        : sortBy((u) => u.role, 'asc'),
    );
  });
});

// Any update to controls automatically re-filters/sorts/paginates the source
controls.patch({ query: 'a' });
controls.patch({ role: 'admin' });
console.log(source.current);  // filtered + sorted page 1
console.log(source.meta.totalItems);
```

### Pitfalls

- The `effect()` runs immediately on creation. If the source has not yet loaded its initial data, the first filter application fires before data is available. Initialize the source before creating the effect.
- Calling `source.batch()` inside the effect is required. Without it, each `ctx.search()` and `ctx.setFilter()` call resets pagination independently, causing multiple intermediate re-renders.
- Modifying `controls` inside the `effect()` callback creates an infinite reactive loop. Only read from `controls` inside the effect; write to it from UI event handlers.

### Related

- [Local Pagination and Filtering](./local-pagination-and-filtering.md)
- [Signals (Ripple)](@vielzeug/ripple/examples/signals)
- [Sourcerer + Courier](./sourcerer-with-courier.md)
