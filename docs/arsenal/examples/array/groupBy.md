---
title: 'Arsenal Examples — groupBy'
description: 'groupBy example for @vielzeug/arsenal.'
---

## groupBy

### Problem

You have a flat array and need to group items into buckets by a computed key — for example grouping transactions by category.

### Solution

Use `groupBy(array, selector)` to produce a `Record<string, T[]>` of key → items pairs.

```ts
import { groupBy } from '@vielzeug/arsenal';

const transactions = [
  { type: 'credit', amount: 100 },
  { type: 'debit', amount: 50 },
  { type: 'credit', amount: 200 },
];

groupBy(transactions, (t) => t.type);
// {
//   credit: [{ type: 'credit', amount: 100 }, { type: 'credit', amount: 200 }],
//   debit:  [{ type: 'debit',  amount: 50 }],
// }
```

#### With string field

```ts
import { groupBy } from '@vielzeug/arsenal';

const users = [
  { name: 'Alice', role: 'admin' },
  { name: 'Bob', role: 'user' },
  { name: 'Carol', role: 'admin' },
];

groupBy(users, (u) => u.role);
// { admin: [Alice, Carol], user: [Bob] }
```

### Pitfalls

- Keys are always coerced to strings. A numeric selector produces string keys in the result.

### Related

- [indexBy](./indexBy.md)
- [countBy](./countBy.md)
- [partition](./partition.md)
