---
title: 'Arsenal Examples — search'
description: 'search example for @vielzeug/arsenal.'
---

## search

### Problem

You need fuzzy search over an array of objects — for example a live search box that still matches "alce" when the user types "alice" with a typo.

### Solution

Use `search(array, query, options?)` to filter or rank results by similarity. `mode: 'filter'` (default) returns `T[]`; `mode: 'scored'` returns `ScoredResult<T>[]` sorted by relevance.

```ts
import { search } from '@vielzeug/arsenal';

const users = [
  { id: 1, name: 'Alice Smith', role: 'admin' },
  { id: 2, name: 'Alan Jones', role: 'user' },
  { id: 3, name: 'Bob Brown', role: 'user' },
];

// Filter mode: items above similarity threshold
const filtered = search(users, 'alice');
// [{ id: 1, name: 'Alice Smith', ... }]
```

#### Scored mode

```ts
import { search } from '@vielzeug/arsenal';

const users = [
  { id: 1, name: 'Alice Smith' },
  { id: 2, name: 'Alan Jones' },
];

const ranked = search(users, 'ali', { mode: 'scored', threshold: 0.3 });
// [
//   { item: { id: 1, ... }, score: 0.91 },
//   { item: { id: 2, ... }, score: 0.52 },
// ]
```

#### Restrict to specific fields

```ts
import { search } from '@vielzeug/arsenal';

const users = [
  { id: 1, name: 'Alice Smith' },
  { id: 2, name: 'Alan Jones' },
];
const results = search(users, 'ali', { fields: ['name'] });
```

### Pitfalls

- The default `threshold` is `0.25`. Lower values return more (noisier) results; raise it to `0.5+` for stricter matching.
- `mode: 'scored'` returns `ScoredResult<T>[]`, not `T[]` — destructure `.item` to access the original object.
- Without `fields`, all string properties of each object are scanned.

### Related

- [sort](./sort.md)
- [filterMap](./select.md)
