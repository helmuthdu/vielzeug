---
title: 'Arsenal Examples — isPromise'
description: 'isPromise example for @vielzeug/arsenal.'
---

## isPromise

### Problem

You need to check whether a value is a thenable (Promise-like) — for example handling functions that may return either a value or a Promise.

### Solution

Use `isPromise(value)` to narrow to `Promise<unknown>`.

```ts
import { isPromise } from '@vielzeug/arsenal';

function normalize<T>(valueOrPromise: T | Promise<T>): Promise<T> {
  return isPromise(valueOrPromise) ? valueOrPromise : Promise.resolve(valueOrPromise);
}
```

### Pitfalls

- Checks for a `.then` method — matches any thenable, not just native `Promise` instances.

### Related

- [isFunction](./isFunction.md)
- [attempt](../async/attempt.md)
