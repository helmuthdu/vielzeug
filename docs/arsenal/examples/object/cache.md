---
title: 'Arsenal Examples — cache'
description: 'cache example for @vielzeug/arsenal.'
---

## cache

### Problem

You need a bounded in-memory cache with optional lazy TTL expiry.

### Solution

```ts
import { cache } from '@vielzeug/arsenal/cache';

const values = cache<string, number>({ capacity: 3, ttlMs: 60_000 });

values.set('a', 1);
values.set('b', 2);
values.set('c', 3);
values.set('d', 4); // evicts 'a'
```

### Pitfalls

- Keys use native `Map` identity.
- Expiry is evaluated lazily on reads and size checks.
- Cache does not persist; use Vault for persistent records.
