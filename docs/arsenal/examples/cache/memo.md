---
title: 'Arsenal Examples — memo'
description: 'memo example for @vielzeug/arsenal.'
---

## memo

### Problem

A pure sync function is called repeatedly with the same arguments and the computation is expensive — you need to cache results without redundant work.

### Solution

Use `memo(fn, options?)` to memoize with an optional `maxSize` (LRU cap) and a custom `key` function. Returns a `Memoized<T>` with `.clear()`, `.invalidate()`, and `.size`.

```ts
import { memo } from '@vielzeug/arsenal/cache';

const expensiveCalc = memo(
  (n: number) => n * n,
  { maxSize: 100 },
);

expensiveCalc(4); // computed: 16
expensiveCalc(4); // cached: 16
expensiveCalc.size;          // 1
expensiveCalc.invalidate(4); // removes entry for 4
expensiveCalc.clear();       // clears all entries
```

#### Custom key for object arguments

```ts
import { memo } from '@vielzeug/arsenal/cache';

const formatLabel = memo(
  (params: { page: number; size: number }) => `Page ${params.page} of ${params.size}`,
  { key: ({ page, size }) => `${page}:${size}` },
);

formatLabel({ page: 1, size: 20 }); // computed
formatLabel({ page: 1, size: 20 }); // cached
```

#### Async caching — use stash instead

`memo` only accepts **sync** functions. For async caching with TTL and stampede prevention:

```ts
import { stash } from '@vielzeug/arsenal/cache';

const userCache = stash<User>({ ttlMs: 60_000, maxSize: 100 });
const user = await userCache.getOrSet('user:1', () => fetchUser(1));
```

### Pitfalls

- `memo` only accepts sync functions — passing an async function is a compile-time error.
- Pass a `key` function when arguments are objects — without it, arguments are `JSON.stringify`-ed, which may be unstable.
- There is no TTL option. Use `stash` when time-based expiry is required.

### Related

- [stash](./stash.md)
- [debounce](../function/debounce.md)
