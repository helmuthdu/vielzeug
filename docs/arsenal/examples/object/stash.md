---
title: 'Arsenal Examples — cache'
description: 'cache example for @vielzeug/arsenal.'
---

## cache

### Problem

You need a typed, in-memory cache for values loaded on demand.

### Solution

```ts
import { cache } from '@vielzeug/arsenal/cache';

const profiles = cache<string, Profile>({ ttlMs: 30_000 });
const profile = await profiles.getOrLoad('me', loadProfile);
```

### Pitfalls

- Keys use native `Map` identity.
- Expired values disappear on later reads.
- Use Vault instead when values must survive process restart.
