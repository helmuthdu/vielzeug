---
title: Toolkit — Function Examples
description: Function utility examples for Toolkit.
---

# Function Utilities

## Quick Reference

- [assert](./function/assert.md)
- [compare](./function/compare.md)
- [compareBy](./function/compareBy.md)
- [compose](./function/compose.md)
- [configure](./function/configure.md)
- [curry](./function/curry.md)
- [debounce](./function/debounce.md)
- [memo](./function/memo.md)
- [once](./function/once.md)
- [pipe](./function/pipe.md)
- [throttle](./function/throttle.md)

## Common Patterns

```ts
import {
  assert,
  compareBy,
  compose,
  configure,
  curry,
  debounce,
  memo,
  once,
  pipe,
  throttle,
} from '@vielzeug/toolkit';
import { select } from '@vielzeug/toolkit';

assert(Array.isArray([1, 2, 3]), 'Expected array');

const sortUsers = compareBy<{ name: string; age: number }>({ age: 'desc', name: 'asc' });

const trimUpper = pipe(
  (s: string) => s.trim(),
  (s) => s.toUpperCase(),
);

const trimUpperRtl = compose(
  (s: string) => s.toUpperCase(),
  (s: string) => s.trim(),
);

const add = (a: number, b: number) => a + b;
const curriedAdd = curry(add);

const doubleAll = configure(select, (n: number) => n * 2);

const expensive = memo((n: number) => n * n);
const initOnce = once(() => console.log('init'));
const onInput = debounce((q: string) => console.log(q), 250);
const onScroll = throttle(() => console.log('scroll'), 100);

console.log(sortUsers, trimUpper, trimUpperRtl, curriedAdd, doubleAll, expensive, initOnce, onInput, onScroll);
```
