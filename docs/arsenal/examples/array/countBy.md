---
title: 'Arsenal Examples — countBy'
description: 'countBy example for @vielzeug/arsenal.'
---

## countBy

### Problem

You have a collection and need to count occurrences grouped by a computed key — for example tallying users by role.

### Solution

Use `countBy(array, selector)` to produce a `Record<string, number>` of key → count pairs.

```ts
import { countBy } from '@vielzeug/arsenal';

const users = [
  { role: 'admin' },
  { role: 'user' },
  { role: 'user' },
  { role: 'admin' },
  { role: 'guest' },
];

countBy(users, (u) => u.role);
// { admin: 2, user: 2, guest: 1 }
```

### Pitfalls

- Keys are always strings (coerced via selector return value). A selector returning a number produces string keys.

### Related

- [groupBy](./group.md)
- [indexBy](./keyBy.md)
