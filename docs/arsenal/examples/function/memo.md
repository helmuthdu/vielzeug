---
title: 'Arsenal Examples — memo'
description: 'memo example for @vielzeug/arsenal.'
---

## memo

### Problem

A pure sync function is called repeatedly with the same arguments and the computation is expensive — you need to cache results and avoid redundant work.

### Solution

Use `memo(fn, options?)` to memoize with an optional `maxSize` (LRU cap) and a custom `key` function. Returns a `Memoized<T>` with `.clear()`, `.invalidate()`, and `.size`.

```ts
import { memo } from '@vielzeug/arsenal';
// or: import { memo } from '@vielzeug/arsenal/cache';

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

#### Custom key for object arguments

```ts
import { memo } from '@vielzeug/arsenal';

const formatLabel = memo((params: { page: number; size: number }) => `Page ${params.page} of ${params.size}`, {
  key: ({ page, size }) => `${page}:${size}`,
});

formatLabel({ page: 1, size: 20 }); // 'Page 1 of 20' — computed
formatLabel({ page: 1, size: 20 }); // cached
```

#### Async caching — use stash instead

`memo` only accepts **sync** functions. For async caching with TTL and stampede prevention use `stash.getOrSet`:

```ts
import { stash } from '@vielzeug/arsenal';

const userCache = stash<User>({ ttlMs: 60_000, maxSize: 100 });

// Concurrent callers with the same key share one in-flight Promise
const user = await userCache.getOrSet('user:1', () => fetchUser(1));
```

### Pitfalls

- `memo` only accepts sync functions — passing an async function is a compile-time error.
- Pass a `key` function when arguments are objects — without it, arguments are `JSON.stringify`-ed, which may be unstable for non-plain objects.
- There is no TTL option. Use `stash` when time-based expiry is required.

### Related

- [stash](../object/stash.md)
- [debounce](./debounce.md)
