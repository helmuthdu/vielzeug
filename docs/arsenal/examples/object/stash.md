---
title: 'Arsenal Examples — stash'
description: 'stash example for @vielzeug/arsenal.'
---

## stash

### Problem

You need a typed cache with TTL expiry, stampede prevention for async factories, and an eviction callback — beyond what a plain `Map` provides.

### Solution

Use `stash(options?)` to create a `Stash<T, K>` instance. `hash` defaults to `String(key)` so no options are needed for string keys.

```ts
import { stash } from '@vielzeug/arsenal';
// or: import { stash } from '@vielzeug/arsenal/cache';

// Simple string-keyed cache — no options required
const sessionCache = stash<User>();
sessionCache.set('user:1', { id: 1, name: 'Alice' }, { ttlMs: 30_000 });
sessionCache.get('user:1'); // { id: 1, name: 'Alice' }
```

#### Global TTL and bounded size

```ts
import { stash } from '@vielzeug/arsenal';

const apiCache = stash<Response>({
  ttlMs: 60_000,  // all entries expire after 60s unless overridden per set()
  maxSize: 500,   // FIFO eviction when exceeded
  onEvict: (key, value) => console.log('evicted', key),
});

apiCache.set('data', response);                       // expires in 60s
apiCache.set('data', response, { ttlMs: 5_000 });    // override: 5s
```

#### Non-string keys

```ts
import { stash } from '@vielzeug/arsenal';

const userCache = stash<User, readonly [string, number]>({
  hash: (key) => JSON.stringify(key),
});

userCache.set(['user', 1], { id: 1, name: 'Alice' });
userCache.get(['user', 1]); // { id: 1, name: 'Alice' }
```

#### Async getOrSet with stampede prevention

```ts
import { stash } from '@vielzeug/arsenal';

const cache = stash<User>();

// Concurrent calls with the same key share one in-flight Promise
const [a, b] = await Promise.all([
  cache.getOrSet('user-1', () => fetchUser(1)),
  cache.getOrSet('user-1', () => fetchUser(1)), // reuses the first in-flight call
]);

// Force a fresh fetch, bypass the cache
const fresh = await cache.getOrSet('user-1', () => fetchUser(1), { forceRefresh: true });
```

### Pitfalls

- `getOrSet` caches `undefined` — if the factory returns `undefined`, subsequent calls return `undefined` without calling the factory again.
- TTL expiry is checked lazily on read — expired entries are not purged until accessed.
- For persistent caches (localStorage, IPC), pass `{ persistence: { serialize, deserialize } }` as a paired object — both fields are required together.

### Related

- [memo](../function/memo.md)
- [stringify](./stringify.md)
