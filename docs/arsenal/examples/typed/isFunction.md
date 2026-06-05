---
title: 'Arsenal Examples — isFunction'
description: 'isFunction example for @vielzeug/arsenal.'
---

## isFunction

### Problem

You need to check whether a value is callable — for example accepting either a static value or a factory function.

### Solution

Use `isFunction(value)` to narrow to `(...args: unknown[]) => unknown`.

```ts
import { isFunction } from '@vielzeug/arsenal';

function resolve<T>(valueOrFactory: T | (() => T)): T {
  return isFunction(valueOrFactory) ? valueOrFactory() : valueOrFactory;
}

resolve(42);          // 42
resolve(() => 42);    // 42
```

### Related

- [isPromise](./isPromise.md)
