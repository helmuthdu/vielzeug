---
title: 'Arsenal Examples — fuzzyFilter / fuzzyScore'
description: 'fuzzyFilter and fuzzyScore examples for @vielzeug/arsenal.'
---

## fuzzyFilter / fuzzyScore

### Problem

You need fuzzy search over an array of objects — for example a live search box that still matches when the user has a typo or uses partial input.

### Solution

Use `fuzzyFilter` to filter an array by similarity (preserving original order), or `fuzzyScore` to get results ranked by score descending.

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
```

#### Restrict to specific fields

```ts
import { fuzzyFilter, fuzzyScore } from '@vielzeug/arsenal';

const products = [
  { id: 1, name: 'Wireless Keyboard', sku: 'WK-001' },
  { id: 2, name: 'Wired Mouse', sku: 'WM-002' },
];

const results = fuzzyFilter(products, 'wireless', { fields: ['name'] });
```

#### Unicode normalization

```ts
import { fuzzyFilter } from '@vielzeug/arsenal';

const names = ['café', 'naïve', 'resume'];
const hits = fuzzyFilter(names, 'cafe', { normalize: true });
// ['café']
```

### Pitfalls

- The default `threshold` is `0.25`. Lower values return more (noisier) results; raise to `0.5+` for stricter matching.
- `fuzzyScore` returns `ScoredResult<T>[]` — destructure `.item` to access the original object.
- An empty query returns all items unchanged.
- Without `fields`, all string-valued properties are scanned.

### Related

- [sort](./sort.md)
- [filterMap](./filterMap.md)
