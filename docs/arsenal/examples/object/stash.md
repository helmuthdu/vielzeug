---
title: 'Arsenal Examples — stash'
description: 'stash example for @vielzeug/arsenal.'
---

## stash

### Problem

You need a typed cache with TTL expiry, stampede prevention for async factories, and an eviction callback — beyond what a plain `Map` or `cache()` provides.

### Solution

Use `stash(options)` to create a `Stash<T, K>` instance with `get`, `set`, `delete`, `clear`, `entries`, and the dual-mode `getOrSet`.

```ts
import { stash } from '@vielzeug/arsenal';

const userCache = stash<User, readonly [string, number]>({
  hash: (key) => JSON.stringify(key),
  onEvict: (key, value) => console.log('evicted', key, value.name),
});

// Store with 30 second TTL
userCache.set(['user', 1], { id: 1, name: 'Alice' }, { ttlMs: 30_000 });
userCache.get(['user', 1]); // { id: 1, name: 'Alice' }
```

#### Async getOrSet with stampede prevention

```ts
import { stash } from '@vielzeug/arsenal';

const cache = stash<User>({ hash: String });

// Concurrent calls with the same key share one in-flight Promise
const [a, b] = await Promise.all([
  cache.getOrSet('user-1', () => fetchUser(1)),
  cache.getOrSet('user-1', () => fetchUser(1)), // reuses the first call
]);
```

### Pitfalls

- `getOrSet` caches `undefined` — if the factory returns `undefined`, subsequent calls return `undefined` without calling the factory again. Use `has()` semantics to distinguish "not cached" from "cached as undefined".
- TTL expiry is checked lazily on access — expired entries are not removed until the key is read.

### Related

- [cache](./cache.md)
- [memo](../function/memo.md)
- [stableStringify](./stableStringify.md)
