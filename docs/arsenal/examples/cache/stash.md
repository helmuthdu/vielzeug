---
title: 'Arsenal Examples — stash'
description: 'stash example for @vielzeug/arsenal.'
---

## stash

### Problem

You need a typed cache with TTL expiry, stampede prevention for async factories, and an eviction callback.

### Solution

Use `stash(options?)` to create a `Stash<T, K>` instance. `hash` defaults to `String(key)` so no options are needed for string keys.

```ts
import { stash } from '@vielzeug/arsenal/cache';

// Simple string-keyed cache — no options required
const sessionCache = stash<User>();
sessionCache.set('user:1', { id: 1, name: 'Alice' }, { ttlMs: 30_000 });
sessionCache.get('user:1'); // { id: 1, name: 'Alice' }
```

#### Global TTL and bounded size

```ts
import { stash } from '@vielzeug/arsenal/cache';

const apiCache = stash<Response>({
  ttlMs: 60_000,  // all entries expire after 60s unless overridden
  maxSize: 500,   // FIFO eviction when exceeded
  onEvict: (key) => console.log('evicted', key),
});

apiCache.set('data', response);                    // expires in 60s
apiCache.set('data', response, { ttlMs: 5_000 }); // override: 5s
```

#### Non-string keys

```ts
import { stash } from '@vielzeug/arsenal/cache';

const userCache = stash<User, readonly [string, number]>({
  hash: (key) => JSON.stringify(key),
});

userCache.set(['user', 1], { id: 1, name: 'Alice' });
userCache.get(['user', 1]); // { id: 1, name: 'Alice' }
```

#### Async getOrSet — stampede prevention

```ts
import { stash } from '@vielzeug/arsenal/cache';

const cache = stash<User>();

// Concurrent calls with the same key share one in-flight Promise
const [a, b] = await Promise.all([
  cache.getOrSet('user-1', () => fetchUser(1)),
  cache.getOrSet('user-1', () => fetchUser(1)), // reuses first in-flight call
]);

// Bypass the cache entirely
const fresh = await cache.getOrSet('user-1', () => fetchUser(1), { forceRefresh: true });
```

#### Persistence hooks

```ts
import { stash } from '@vielzeug/arsenal/cache';

// Plug in localStorage or any external store
const persistentCache = stash<string>({
  persistence: {
    deserialize: (raw) => JSON.parse(raw) as string,
    serialize: (v) => JSON.stringify(v),
  },
});
```

### Pitfalls

- `getOrSet` caches `undefined` — if the factory returns `undefined`, subsequent calls return it without calling the factory again.
- TTL expiry is checked lazily on read — expired entries are not purged until accessed.
- `persistence.serialize` and `persistence.deserialize` must both be present; the pair is validated at the TypeScript level.

### Related

- [memo](./memo.md)
- [stringify](../object/stringify.md)
