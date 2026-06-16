---
title: 'Arsenal Examples — indexBy'
description: 'indexBy example for @vielzeug/arsenal.'
---

## indexBy

### Problem

You have an array and need O(1) lookup by a unique key — for example building an id-to-object map from an API response.

### Solution

Use `indexBy(array, selector)` to produce a `Record<string, T>` keyed by the selector result.

```ts
import { indexBy } from '@vielzeug/arsenal';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

const byId = indexBy(users, (u) => u.id);
byId[1]; // { id: 1, name: 'Alice' }
byId[2]; // { id: 2, name: 'Bob' }
```

### Pitfalls

- If multiple items share the same key, the last one wins.
- Keys are always coerced to strings — numeric ids become string keys in the record.

### Related

- [groupBy](./groupBy.md)
- [countBy](./countBy.md)
