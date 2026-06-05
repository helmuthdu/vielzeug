---
title: 'Arsenal Examples — compareBy'
description: 'compareBy example for @vielzeug/arsenal.'
---

## compareBy

### Problem

You need a reusable multi-key comparator function — for example sorting a table by multiple columns with mixed directions.

### Solution

Use `compareBy(selectors)` to create a comparator from an object of `{ field: 'asc' | 'desc' }` selectors.

```ts
import { compareBy } from '@vielzeug/arsenal';

const users = [
  { name: 'Bob',   age: 30 },
  { name: 'Alice', age: 30 },
  { name: 'Carol', age: 25 },
];

const byAgeDescNameAsc = compareBy<typeof users[0]>({ age: 'desc', name: 'asc' });

users.sort(byAgeDescNameAsc);
// [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 30 }, { name: 'Carol', age: 25 }]
```

### Pitfalls

- Earlier keys take priority; later keys are tie-breakers.

### Related

- [compare](./compare.md)
- [sort](../array/sort.md)
