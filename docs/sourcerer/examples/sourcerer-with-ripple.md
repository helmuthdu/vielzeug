---
title: 'Sourcerer Examples — Reactive Controls with Ripple'
description: 'Drive a Sourcerer model from Ripple signals so multiple UI controls stay in sync automatically.'
---

## Reactive Controls with Ripple

### Problem

Multiple UI elements — a search input, a role filter dropdown, a sort toggle — all control the same list. Without shared state, each control needs its own callback wired to the source, and keeping them in sync requires threading state manually.

### Solution

Use `toSignals()` to expose the source as reactive Ripple signals, and store shared control state in a Ripple `store`. An `effect()` projects control changes into the source whenever any value changes.

```ts
import { effect, store } from '@vielzeug/ripple';
import { createLocalSource, toSignals } from '@vielzeug/sourcerer';

type User = { id: number; name: string; role: 'admin' | 'member' };

const users: User[] = [
  { id: 1, name: 'Ada Lovelace', role: 'admin' },
  { id: 2, name: 'Grace Hopper', role: 'admin' },
  { id: 3, name: 'Linus Torvalds', role: 'member' },
  { id: 4, name: 'Margaret Hamilton', role: 'member' },
];

const source = createLocalSource(users, { limit: 2 });
const { current, meta, dispose } = toSignals(source);

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
    sort === 'name'
      ? (a, b) => a.name.localeCompare(b.name)
      : (a, b) => a.role.localeCompare(b.role),
  );
  void source.searchNow(query);
});

// Any update to controls automatically re-filters/sorts/paginates the source
controls.patch({ query: 'a' });
controls.patch({ role: 'admin' });

// current and meta update automatically via the signal adapters
console.log(current.value);        // filtered + sorted page 1
console.log(meta.value.totalItems);

// Clean up when done
dispose();
```

### Using `toSignals` for framework integration

If you're using a framework with a reactive runtime (Vue, Solid, etc.), `toSignals()` lets you skip manual `subscribe()` wiring entirely.

```ts
import { toSignals } from '@vielzeug/sourcerer';

const source = createRemoteSource({ fetch, limit: 20 });
const { current, meta, dispose } = toSignals(source);

// In a Vue composable:
// current.value and meta.value are live — no subscribe/unsubscribe needed
```

### Pitfalls

- The `effect()` runs immediately on creation. Make sure the source is initialized before the effect is created.
- Do **not** write to `controls` inside the `effect()` callback — this creates an infinite reactive loop. Only read from `controls` in the effect; write from UI event handlers.
- Calling `setFilter()`, `setSort()`, and `searchNow()` in sequence triggers three recomputes. For a single notification, consider setting `filter` and `sort` in the initial config and only using `searchNow()` from the effect.
- Always call `dispose()` when the component or page is torn down to release the signal subscriptions.

### Related

- [Local Pagination and Filtering](./local-pagination-and-filtering.md)
- [Ripple Signals](/ripple/examples/signals)
- [Remote Data with Courier](./sourcerer-with-courier.md)
