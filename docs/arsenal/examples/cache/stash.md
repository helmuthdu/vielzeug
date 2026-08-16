---
title: 'Arsenal Examples — cache'
description: 'cache example for @vielzeug/arsenal.'
---

## cache

### Problem

You need an in-memory TTL cache with identity keys and deduplicated async loads.

### Solution

```ts
import { cache } from '@vielzeug/arsenal/cache';

const users = cache<string, User>({ ttlMs: 60_000 });
const user = await users.getOrLoad('user:1', () => fetchUser(1));

users.delete('user:1');
```

### Pitfalls

- Cache is in-memory only. Use Vault for persistence.
- TTL expiry is lazy: reads remove expired entries. The `size` getter does not evict.
- Equal object literals are different keys; native `Map` identity applies.
