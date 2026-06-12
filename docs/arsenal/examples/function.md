---
title: Arsenal — Function Examples
description: Function utility examples for Arsenal.
---

## Quick Reference

- [allOf / anyOf / noneOf](./function/allOf.md)
- [assert](./function/assert.md)
- [compare](./function/compare.md)
- [compareBy](./function/compareBy.md)
- [compose](./function/compose.md)
- [constant](./function/constant.md)
- [curry](./function/curry.md)
- [debounce](./function/debounce.md)
- [identity](./function/identity.md)
- [memo](./function/memo.md)
- [not](./function/not.md)
- [once](./function/once.md)
- [partial](./function/partial.md)
- [pipe](./function/pipe.md)
- [runAll](./function/runAll.md)
- [tap](./function/tap.md)
- [throttle](./function/throttle.md)

## Common Patterns

```ts
import {
  allOf,
  anyOf,
  assert,
  compareBy,
  compose,
  constant,
  curry,
  debounce,
  identity,
  memo,
  noneOf,
  once,
  partial,
  pipe,
  tap,
  throttle,
} from '@vielzeug/arsenal';

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

// allOf: true only when every predicate matches (vacuous truth with zero predicates)
const isWorkingAge = allOf<number>(
  (age) => age >= 18,
  (age) => age < 65,
);

// anyOf: true when at least one predicate matches (vacuous falsity with zero predicates)
const isSpecialAge = anyOf<number>(
  (age) => age === 0,
  (age) => age === 100,
);

// noneOf: true when no predicate matches — single predicate equivalent to logical NOT
const odds = [1, 2, 3, 4].filter(noneOf((n: number) => n % 2 === 0));

const expensive = memo((n: number) => n * n);
const identityValue = identity('ok');
const alwaysFive = constant(5);
const observed = tap(42, (value) => console.log('tap', value));
const initOnce = once(() => console.log('init'));
const onInput = debounce((q: string) => console.log(q), 250);
const onScroll = throttle(() => console.log('scroll'), 100);

console.log(
  sortUsers,
  trimUpper('  alice  '),
  trimUpperRtl('  alice  '),
  curriedAdd(2)(3),
  double(8),
  expensive(4),
  identityValue,
  alwaysFive(),
  odds,
  observed,
  isWorkingAge(32, 0, [32]),
  isSpecialAge(0, 0, [0]),
  initOnce(),
  onInput,
  onScroll,
);
```
