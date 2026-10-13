---
title: 'Arsenal Examples: paginate'
description: 'paginate example for @vielzeug/arsenal.'
---

## paginate

### Problem

You hold a full list in memory and a view needs one page of it plus the totals that describe the paging, without hand-rolling `slice()` arithmetic in every caller.

### Solution

Use `paginate(items, options)` to cut one page and return it with the arithmetic that produced it.

```ts
import { paginate } from '@vielzeug/arsenal';

const rows = Array.from({ length: 45 }, (_, index) => ({ id: index + 1 }));

paginate(rows, { page: 2, pageSize: 10 });
// {
//   items: [{ id: 11 }, …, { id: 20 }],
//   page: 2,
//   pageSize: 10,
//   totalItems: 45,
//   totalPages: 5,
// }
```

#### Zero-based callers

```ts
import { paginate } from '@vielzeug/arsenal';

paginate(rows, { page: 0, pageSize: 10, pageOffset: 0 }); // Spring-style page numbers
// The envelope echoes page: 0, so the same base goes back out.
```

### Pitfalls

- `page` is echoed, never clamped: a page past the last returns empty `items`.
- `totalPages` is at least 1, even for an empty list, so `page < totalPages` never underflows.
- Throws `RangeError` for a non-integer `page` in its own base or a `pageSize` that is not a positive integer.

### Related

- [chunk](./chunk.md)
- [take](./take.md)
- [sort](./sort.md)
