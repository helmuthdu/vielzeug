---
title: Toolkit — Function Examples
description: Function utility examples for Toolkit.
---

## Function Utilities

## Quick Reference

- [assert](./function/assert.md)
- [compare](./function/compare.md)
- [compareBy](./function/compareBy.md)
- [compose](./function/compose.md)
- [partial](./function/configure.md)
- [constant](./function/constant.md)
- [curry](./function/curry.md)
- [debounce](./function/debounce.md)
- [flip (removed)](./function/flip.md)
- [identity](./function/identity.md)
- [memo](./function/memo.md)
- [negate](./function/negate.md)
- [once](./function/once.md)
- [pipe](./function/pipe.md)
- [tap](./function/tap.md)
- [throttle](./function/throttle.md)

## Common Patterns

```ts
import {
  assert,
  compareBy,
  compose,
  constant,
  curry,
  debounce,
  identity,
  memo,
  negate,
  and,
  once,
  partial,
  pipe,
  tap,
  throttle,
} from '@vielzeug/toolkit';

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

const double = partial((value: number, factor: number) => value * factor, 2);
const isWorkingAge = and<number>((age) => age >= 18, (age) => age < 65);

const expensive = memo((n: number) => n * n);
const identityValue = identity('ok');
const alwaysFive = constant(5);
const odds = [1, 2, 3, 4].filter(negate((n: number) => n % 2 === 0));
const ratio = ((a: number, b: number) => a / b)(10, 2); // 5
const observed = tap(42, (value) => console.log('tap', value));
const initOnce = once(() => console.log('init'));
const onInput = debounce((q: string) => console.log(q), 250);
const onScroll = throttle(() => console.log('scroll'), 100);

console.log(
  sortUsers,
  trimUpper,
  trimUpperRtl,
  curriedAdd,
  double,
  expensive,
  identityValue,
  alwaysFive,
  odds,
  ratio,
  observed,
  isWorkingAge,
  initOnce,
  onInput,
  onScroll,
);
```
