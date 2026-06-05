---
title: 'Arsenal Examples — cache'
description: 'cache example for @vielzeug/arsenal.'
---

## cache

### Problem

You need a simple bounded FIFO key-value store — for example memoizing the last N computed results without the complexity of TTL or stampede prevention.

### Solution

Use `cache(maxSize)` to create a `{ get, set }` map that evicts the oldest entry when it exceeds `maxSize`.

```ts
import { cache } from '@vielzeug/arsenal';

const c = cache<string, number>(3);

c.set('a', 1);
c.set('b', 2);
c.set('c', 3);
c.set('d', 4); // evicts 'a' (oldest)

c.get('a'); // undefined
c.get('d'); // 4
```

### Pitfalls

- `cache` is a simple FIFO eviction — it does not track access frequency. Use `stash` when you need TTL expiry, eviction callbacks, or stampede prevention.

### Related

- [stash](./stash.md)
- [memo](../function/memo.md)
