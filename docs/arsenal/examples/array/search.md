---
title: 'Arsenal Examples — fuzzyFilter / fuzzyScore'
description: 'fuzzyFilter and fuzzyScore examples for @vielzeug/arsenal.'
---

## fuzzyFilter / fuzzyScore

### Problem

You need fuzzy search over an array of objects — for example a live search box that still matches when the user has a typo or uses partial input.

### Solution

Use `fuzzyFilter` to filter an array by similarity (preserving order), or `fuzzyScore` to get results ranked by score.

```ts
import { fuzzyFilter } from '@vielzeug/arsenal';

const users = [
  { id: 1, name: 'Alice Smith', role: 'admin' },
  { id: 2, name: 'Alan Jones', role: 'user' },
  { id: 3, name: 'Bob Brown', role: 'user' },
];

// Returns matching items in original array order
const filtered = fuzzyFilter(users, 'alice');
// [{ id: 1, name: 'Alice Smith', ... }]
```

#### Ranked results with fuzzyScore

```ts
import { fuzzyScore } from '@vielzeug/arsenal';

const users = [
  { id: 1, name: 'Alice Smith' },
  { id: 2, name: 'Alan Jones' },
];

const ranked = fuzzyScore(users, 'ali', { threshold: 0.3 });
// [
//   { item: { id: 1, name: 'Alice Smith' }, score: 0.91 },
//   { item: { id: 2, name: 'Alan Jones' }, score: 0.52 },
// ]
// Results are sorted by score descending
```

#### Restrict to specific fields

```ts
import { fuzzyFilter, fuzzyScore } from '@vielzeug/arsenal';

const products = [
  { id: 1, name: 'Wireless Keyboard', sku: 'WK-001' },
  { id: 2, name: 'Wired Mouse', sku: 'WM-002' },
];

// Only match against the name field, not sku
const results = fuzzyFilter(products, 'wireless', { fields: ['name'] });
```

#### Unicode normalization

```ts
import { fuzzyFilter } from '@vielzeug/arsenal';

const names = ['café', 'naïve', 'resume'];

// normalize: true makes 'cafe' match 'café'
const hits = fuzzyFilter(names, 'cafe', { normalize: true });
// ['café']
```

### Pitfalls

- The default `threshold` is `0.25`. Lower values return more (noisier) results; raise to `0.5+` for stricter matching.
- `fuzzyScore` returns `ScoredResult<T>[]` — destructure `.item` to access the original object.
- An empty query returns all items unchanged (at score `1` for `fuzzyScore`).
- Without `fields`, all string-valued properties at up to 10 levels deep are scanned.

### Related

- [sort](./sort.md)
- [filterMap](./select.md)
