---
title: 'Arsenal Examples — replace'
description: 'replace example for @vielzeug/arsenal.'
---

## replace

### Problem

You need to swap one item in an array with a new value without mutating the original — for example updating a single record in an immutable list.

### Solution

Use `replace(array, predicate, value)` to return a new array with the first matching item replaced.

```ts
import { replace } from '@vielzeug/arsenal';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

replace(users, (u) => u.id === 2, { id: 2, name: 'Robert' });
// [{ id: 1, name: 'Alice' }, { id: 2, name: 'Robert' }]
```

### Pitfalls

- Only the first matching item is replaced. Use `filterMap` or `map` for replacing all matches.
- Returns the original array unchanged if no item matches.

### Related

- [toggle](./toggle.md)
- [filterMap](./select.md)
