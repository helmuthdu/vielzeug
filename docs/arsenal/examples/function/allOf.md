---
title: 'Arsenal Examples — allOf / anyOf / noneOf'
description: 'allOf, anyOf, noneOf example for @vielzeug/arsenal.'
---

## allOf / anyOf / noneOf

### Problem

You need to combine multiple predicate functions with AND, OR, or NOR logic — for example building a compound filter without nested `&&` / `||` chains.

### Solution

Use `allOf`, `anyOf`, or `noneOf` to compose predicates into a single function.

```ts
import { allOf, anyOf, noneOf } from '@vielzeug/arsenal';

const isWorkingAge = allOf<number>(
  (age) => age >= 18,
  (age) => age < 65,
);

isWorkingAge(30); // true
isWorkingAge(70); // false — fails second predicate

const isSpecialAge = anyOf<number>(
  (age) => age === 0,
  (age) => age === 100,
);

isSpecialAge(0);  // true
isSpecialAge(50); // false

const noEvens = noneOf<number>((n) => n % 2 === 0);
[1, 2, 3, 4].filter(noEvens); // [1, 3]
```

### Pitfalls

- `allOf` with zero predicates returns `true` (vacuous truth).
- `anyOf` with zero predicates returns `false` (vacuous falsity).
- `noneOf` with a single predicate is equivalent to logical NOT — use `not` for that case to signal intent clearly.

### Related

- [not](./not.md)
- [filterMap](../array/select.md)
