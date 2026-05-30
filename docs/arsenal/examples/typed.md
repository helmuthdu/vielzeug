---
title: Arsenal — Typed Examples
description: Runtime type-checking examples for Arsenal's is namespace.
---

## Typed Utilities

Use the `is` namespace for runtime checks with TypeScript narrowing.

```ts
import { is } from '@vielzeug/arsenal';
```

## Available Methods

- `is.array`
- `is.boolean`
- `is.date`
- `is.defined`
- `is.empty`
- `is.equal`
- `is.fn`
- `is.greaterThan`
- `is.greaterThanOrEqual`
- `is.lessThan`
- `is.lessThanOrEqual`
- `is.match`
- `is.nil`
- `is.number`
- `is.object`
- `is.primitive`
- `is.promise`
- `is.regex`
- `is.string`
- `is.typeOf`
- `is.within`

Standalone numeric predicates:

- `isGreaterThan`
- `isGreaterThanOrEqual`
- `isLessThan`
- `isLessThanOrEqual`
- `isWithin`

## Example

```ts
import {
  is,
  isGreaterThan,
  isGreaterThanOrEqual,
  isLessThan,
  isLessThanOrEqual,
  isNumber,
  isWithin,
} from '@vielzeug/arsenal';

function normalize(value: unknown) {
  if (is.string(value)) return value.trim();
  if (is.number(value)) return value.toFixed(2);
  if (is.array(value)) return value.length;
  if (is.nil(value)) return null;
  return value;
}

const ok = is.equal({ a: 1 }, { a: 1 });
const match = is.match({ a: 1, b: 2 }, { a: 1 });
const tag = is.typeOf(new Date()); // 'date'

const predicates = {
  isNumber: isNumber(4),
  isWithin: isWithin(5, 1, 10),
  isGt: isGreaterThan(5, 4),
  isGe: isGreaterThanOrEqual(5, 5),
  isLt: isLessThan(4, 5),
  isLe: isLessThanOrEqual(5, 5),
};

console.log(normalize('  hi  '), ok, match, tag, predicates);
```

## Standalone Predicate Pages

- [isGreaterThan](./typed/isGreaterThan.md)
- [isGreaterThanOrEqual](./typed/isGreaterThanOrEqual.md)
- [isLessThan](./typed/isLessThan.md)
- [isLessThanOrEqual](./typed/isLessThanOrEqual.md)
- [isWithin](./typed/isWithin.md)
