---
title: 'Sourcerer Examples — Reactive Controls with Ripple'
description: 'Drive a Sourcerer model from Ripple signals so multiple UI controls stay in sync automatically.'
---

## Reactive Controls with Ripple

### Problem

Multiple UI elements — a search input, a role filter dropdown, a sort toggle — all control the same list. Without shared state, each control needs its own callback wired to the source, and keeping them in sync requires threading state manually.

### Solution

Subscribe to the source and drive Ripple signals from the callback. Store shared control state in a Ripple `store`. An `effect()` projects control changes into the source whenever any value changes.

```ts
import { effect, signal, store } from '@vielzeug/ripple';
import { createLocalSource } from '@vielzeug/sourcerer';

type User = { id: number; name: string; role: 'admin' | 'member' };

const users: User[] = [
  { id: 1, name: 'Ada Lovelace', role: 'admin' },
  { id: 2, name: 'Grace Hopper', role: 'admin' },
  { id: 3, name: 'Linus Torvalds', role: 'member' },
  { id: 4, name: 'Margaret Hamilton', role: 'member' },
];

const source = createLocalSource(users, { limit: 2 });
const current = signal<readonly User[]>([]);
const meta = signal(source.meta);

// Drive Ripple signals whenever the source changes
const unsub = source.subscribe(() => {
  current.value = source.current;
  meta.value = source.meta;
});

const controls = store({
  query: '',
  role: 'all' as 'all' | 'admin' | 'member',
  sort: 'name' as 'name' | 'role',
});

// Reactively project shared UI state into the source
effect(() => {
  const { query, role, sort } = controls.value;
  void source.setFilter(role === 'all' ? undefined : (user) => user.role === role);
  void source.setSort(
    sort === 'name' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => a.role.localeCompare(b.role),
  );
  void source.search(query); // debounced — fires after debounceMs
});

// Any update to controls automatically re-filters/sorts/paginates the source
controls.patch({ query: 'a' });
controls.patch({ role: 'admin' });

// current and meta update automatically
console.log(current.value); // filtered + sorted page 1
console.log(meta.value.totalItems);

// Clean up when done
unsub();
source.dispose();
```

### Pitfalls

- The `effect()` runs immediately on creation. Make sure the source is initialized before the effect is created.
- Do **not** write to `controls` inside the `effect()` callback — this creates an infinite reactive loop. Only read from `controls` in the effect; write from UI event handlers.
- Calling `setFilter()`, `setSort()`, and `search()` in sequence triggers three recomputes. For a single notification, use `source.patch({ filter, sort, search })` instead.
- Always call `unsub()` and `source.dispose()` when the component or page is torn down.

### Related

- [Local Pagination and Filtering](./local-pagination-and-filtering.md)
- [Ripple Signals](/ripple/examples/signals)
- [Remote Data with Courier](./sourcerer-with-courier.md)
