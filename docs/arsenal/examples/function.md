---
title: Arsenal — Function Examples
description: Function utility examples for Arsenal.
---

## Quick Reference

- [assert](./function/assert.md)
- [debounce](./function/debounce.md)
- [once](./function/once.md)
- [pipe](./function/pipe.md)
- [runAll](./function/runAll.md)
- [tap](./function/tap.md)
- [throttle](./function/throttle.md)

## Common Patterns

```ts
import { compareBy } from '@vielzeug/arsenal/array';
import { memo } from '@vielzeug/arsenal/cache';
import { debounce, once, pipe, throttle } from '@vielzeug/arsenal/function';
import { allOf, anyOf, noneOf } from '@vielzeug/arsenal/guards';

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
