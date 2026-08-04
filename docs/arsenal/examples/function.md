---
title: Arsenal — Function Examples
description: Function utility examples for Arsenal.
---

## Quick Reference

- [allOf / anyOf / noneOf](./function/allOf.md)
- [assert](./function/assert.md)
- [debounce](./function/debounce.md)
- [memo](./function/memo.md)
- [not](./function/not.md)
- [once](./function/once.md)
- [pipe](./function/pipe.md)
- [runAll](./function/runAll.md)
- [tap](./function/tap.md)
- [throttle](./function/throttle.md)

## Common Patterns

```ts
import { compareBy } from '@vielzeug/arsenal/array';
import { memo } from '@vielzeug/arsenal/cache';
import { debounce, once, pipe, tap, throttle } from '@vielzeug/arsenal/function';
import { allOf, anyOf, noneOf } from '@vielzeug/arsenal/guards';

assert(Array.isArray([1, 2, 3]), 'Expected array');

const sortUsers = compareBy<{ name: string; age: number }>({ age: 'desc', name: 'asc' });

const trimUpper = pipe(
  (s: string) => s.trim(),
  (s) => s.toUpperCase(),
);

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
const observed = tap(42, (value) => console.log('tap', value));
const initOnce = once(() => console.log('init'));
const onInput = debounce((q: string) => console.log(q), 250);
const onScroll = throttle(() => console.log('scroll'), 100);

console.log(
  sortUsers,
  trimUpper('  alice  '),
  expensive(4),
  odds,
  observed,
  isWorkingAge(32, 0, [32]),
  isSpecialAge(0, 0, [0]),
  initOnce(),
  onInput,
  onScroll,
);
```
