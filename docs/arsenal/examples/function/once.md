---
title: 'Arsenal Examples — once'
description: 'once example for @vielzeug/arsenal.'
---

## once

### Problem

You need a function to execute at most once — for example initializing a singleton, registering a global listener, or running a migration.

### Solution

Use `once(fn)` to wrap a function so it runs only on the first call. Subsequent calls return the same result. The returned function exposes `.reset()` to allow re-invocation.

```ts
import { once } from '@vielzeug/arsenal';

const init = once(() => {
  console.log('initialized');
  return 42;
});

init(); // 'initialized' logged, returns 42
init(); // returns 42, no log
init(); // returns 42, no log

init.reset(); // allow re-invocation
init(); // 'initialized' logged again, returns 42
```

### Pitfalls

- The result is memoized after the first call — if `fn` throws, the error is not cached and subsequent calls re-throw.

### Related

- [memo](./memo.md)
- [constant](./constant.md)
