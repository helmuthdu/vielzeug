---
title: 'Arsenal Examples — once'
description: 'once example for @vielzeug/arsenal.'
---

## once

### Problem

You need a function that runs exactly once, caching the result and returning the same value on subsequent calls.

### Solution

Use `once(fn)` to wrap a function. Subsequent calls skip execution and return the cached result. Call `.reset()` to allow re-invocation.

```ts
import { once } from '@vielzeug/arsenal';

const init = once(() => {
  console.log('initialised');
  return { db: true };
});

init(); // logs 'initialised', returns { db: true }
init(); // returns { db: true } — no log
init(); // returns { db: true } — no log

init.reset(); // re-arms
init(); // logs 'initialised' again
```

### Pitfalls

- The wrapped function's arguments are ignored on the second and subsequent calls.
- `reset()` clears the cached return value as well as the invocation guard.

### Related

- [memo](./memo.md)
- [pipe](./pipe.md)
