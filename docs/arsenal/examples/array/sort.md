---
title: 'Arsenal Examples — sort'
description: 'sort example for @vielzeug/arsenal.'
---

## sort

### Problem

You need to sort an array by one or multiple fields without mutating the original, and with clear asc/desc control per field.

### Solution

Use `sort(array, selectors)` with an object of `{ field: 'asc' | 'desc' }` pairs. Earlier keys take priority; ties fall through to the next.

```ts
import { sort } from '@vielzeug/arsenal';

const users = [
  { name: 'Bob',   age: 30 },
  { name: 'Alice', age: 30 },
  { name: 'Carol', age: 25 },
];

sort(users, { age: 'desc', name: 'asc' });
// [
//   { name: 'Alice', age: 30 },
//   { name: 'Bob',   age: 30 },
//   { name: 'Carol', age: 25 },
// ]
```

#### Single-key sort

```ts
import { sort } from '@vielzeug/arsenal';

sort([3, 1, 4, 1, 5], { '': 'asc' }); // won't work for primitives — use native .sort()
sort([{ n: 3 }, { n: 1 }], { n: 'asc' }); // [{ n: 1 }, { n: 3 }]
```

### Pitfalls

- Returns a new array; the original is never mutated.
- String comparison uses `localeCompare` — results may differ from `<`/`>` comparisons.

### Related

- [search](./search.md)
- [groupBy](./group.md)
