---
title: 'Arsenal Examples — parallel'
description: 'parallel example for @vielzeug/arsenal.'
---

## parallel

### Problem

You need to run async tasks over an array concurrently but want to cap the number of in-flight tasks to avoid overwhelming a server or rate-limit.

### Solution

Use `parallel(array, fn, { limit })` to process items with bounded concurrency. Results are returned in input order.

```ts
import { parallel } from '@vielzeug/arsenal';

const ids = [1, 2, 3, 4, 5, 6, 7, 8];

const results = await parallel(
  ids,
  async (id) => fetch(`/api/items/${id}`).then((r) => r.json()),
  { limit: 3 }, // at most 3 in-flight at once
);
// results[0] corresponds to ids[0], etc.
```

#### Without a limit

```ts
import { parallel } from '@vielzeug/arsenal';

// All tasks start simultaneously — equivalent to Promise.all with a map
const all = await parallel([1, 2, 3], async (n) => n * 2);
// [2, 4, 6]
```

### Pitfalls

- Without `limit`, all items start concurrently — set `limit` explicitly for large arrays.
- If any task throws, the whole call rejects. Wrap individual tasks in `attempt` if you need partial failures.
- Results are in input order, not completion order.

### Related

- [queue](./queue.md)
- [attempt](./attempt.md)
