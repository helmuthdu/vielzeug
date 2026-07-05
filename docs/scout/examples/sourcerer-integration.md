---
title: 'Scout Examples — Sourcerer Integration'
description: "Use toSearchFn to plug a ScoutIndex into sourcerer's LocalSource as a searchFn drop-in."
---

## Sourcerer Integration

### Problem

`sourcerer`'s `createLocalSource` accepts a `searchFn`, but writing your own means re-implementing ranking, weighting, and fuzzy matching from scratch.

### Solution

Pass `toSearchFn(index)` as `searchFn` — it delegates every query to the underlying `ScoutIndex` and returns plain items in score order, ignoring the `items` argument `sourcerer` normally passes in.

```ts
import { createIndex, toSearchFn } from '@vielzeug/scout';
import { createLocalSource } from '@vielzeug/sourcerer';

type User = { email: string; id: number; name: string; role: string };

const users: User[] = [
  { email: 'alice@example.com', id: 1, name: 'Alice Johnson', role: 'admin' },
  { email: 'bob@example.com', id: 2, name: 'Bob Smith', role: 'editor' },
  { email: 'charlie@example.com', id: 3, name: 'Charlie Brown', role: 'viewer' },
  { email: 'dave@example.com', id: 4, name: 'Dave Alison', role: 'viewer' },
];

// Build the index once — at module load time, not inside render
const index = createIndex(users, {
  fields: [
    { field: 'name', weight: 2 },
    { field: 'email' },
    { field: 'role' },
  ],
  threshold: 0.25,
});

// Plug into sourcerer — the source delegates all search queries to Scout
const source = createLocalSource(users, {
  pageSize: 10,
  searchFn: toSearchFn(index),
});

// Subscribe to reactive data changes
const sub = source.subscribe(({ data, meta }) => {
  console.log(`${meta.totalItems} result(s):`);
  data.forEach(u => console.log(`  ${u.name} (${u.email})`));
});

// Scout handles the query — sourcerer handles paging and filtering
source.patch({ search: 'alice' });
// → 2 result(s):
//   Alice Johnson (alice@example.com)
//   Dave Alison (dave@example.com)

source.patch({ search: '' });
// → 4 result(s): (all users)

// Keep the index in sync with mutations, then push the updated corpus to sourcerer
const newUser: User = { email: 'eve@example.com', id: 5, name: 'Eve Adams', role: 'admin' };
users.push(newUser);
index.add(newUser);
await source.setData(users);

// Cleanup
sub.dispose();
source.dispose();
```

### Pitfalls

- `toSearchFn()`'s returned function ignores its `items` argument — the `ScoutIndex` is always the source of truth. Keep the index in sync with `index.add()` / `remove()` / `reindex()` when the underlying array changes.
- After mutating the index, call `source.setData(users)` to make `sourcerer` recompute against the updated corpus — creating a brand-new `LocalSource` per mutation (instead of reusing one) discards its existing subscriptions.
- `toFilterPredicate()` is a snapshot, not reactive — re-call it if you need a `filter` predicate instead of a `searchFn`, and the query or corpus has changed.

### Related

- [Basic Search](./basic-search.md)
- [Reactive Combobox](./reactive-combobox.md)
