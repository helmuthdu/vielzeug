---
title: 'Arsenal Examples — memo'
description: 'memo example for @vielzeug/arsenal.'
---

## memo

### Problem

A pure function is called repeatedly with the same arguments and the computation is expensive — you need to cache results and avoid redundant work.

### Solution

Use `memo(fn, options?)` to memoize with optional `ttl` (ms), `maxSize` (LRU cap), and a custom `key` function. Returns a `Memoized<T>` with `.clear()`, `.invalidate()`, and `.size`.

```ts
import { memo } from '@vielzeug/arsenal';

const expensiveCalc = memo(
  (n: number) => {
    // simulate expensive work
    return n * n;
  },
  { maxSize: 100 },
);

expensiveCalc(4); // computed: 16
expensiveCalc(4); // cached: 16
expensiveCalc.size; // 1
expensiveCalc.invalidate(4); // removes entry for 4
expensiveCalc.clear(); // clears all entries
```

#### Async memoization with in-flight deduplication

```ts
import { memo } from '@vielzeug/arsenal';

const fetchUser = memo((id: number) => fetch(`/api/users/${id}`).then((r) => r.json()), { maxSize: 50, ttl: 60_000 });

// Concurrent calls with the same id share one in-flight Promise
const [a, b] = await Promise.all([fetchUser(1), fetchUser(1)]);
```

### Pitfalls

- Pass a `key` function when arguments are objects — by default arguments are stringified, which may not be stable.
- `ttl` expiry is checked on access, not proactively — stale entries are not removed until the key is read.

### Related

- [stash](../object/stash.md)
- [debounce](./debounce.md)
