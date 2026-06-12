---
title: 'Arsenal Examples — getOrCreate'
description: 'getOrCreate example for @vielzeug/arsenal.'
---

## getOrCreate

### Problem

You need lazy initialisation of a `Map` entry — create the value only on first access, then cache it for subsequent reads.

### Solution

Use `getOrCreate(map, key, build)` to return the existing value or call `build()` and store the result.

```ts
import { getOrCreate } from '@vielzeug/arsenal';

const registry = new Map<string, string[]>();

// First call: builds the array and stores it
getOrCreate(registry, 'events', () => []).push('click');
// Second call: returns the existing array
getOrCreate(registry, 'events', () => []).push('keydown');

registry.get('events'); // ['click', 'keydown']
```

### Pitfalls

- `build` is only called when the key is absent. If the stored value is `undefined`, `build` is not called again.

### Related

- [stash](./stash.md)
- [cache](./cache.md)
