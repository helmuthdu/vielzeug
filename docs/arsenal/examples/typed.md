---
title: Arsenal — Typed Examples
description: Runtime type-checking examples for Arsenal's typed predicates.
---

## Typed Utilities

Arsenal exports standalone typed predicates for runtime narrowing. There is no `is` namespace.

```ts
import { isString, isNumber, isNil, ... } from '@vielzeug/arsenal';
```

## Available Predicates

- `isAbortError(value)` — `Error` with `name === 'AbortError'`
- `isBoolean(value)`
- `isDate(value)`
- `isDefined(value)` — not `undefined`
- `isEmpty(value)` — empty string, array, object, `Map`, or `Set`
- `isEqual(a, b, options?)` — deep or shallow equality
- `isError(value)`
- `isFunction(value)`
- `isMatch(object, source)` — partial structural match (plain objects and arrays only)
- `isNil(value)` — `null` or `undefined`
- `isNumber(value)`
- `isPlainObject(value)` — `Object.prototype` or `null` prototype; excludes class instances and built-ins
- `isPrimitive(value)` — `string`, `number`, or `boolean`
- `isPromise(value)`
- `isRegex(value)`
- `isString(value)`

## Example

```ts
import {
  isAbortError,
  isBoolean,
  isDate,
  isDefined,
  isEmpty,
  isEqual,
  isError,
  isFunction,
  isMatch,
  isNil,
  isNumber,
  isPlainObject,
  isPrimitive,
  isString,
} from '@vielzeug/arsenal';

function normalize(value: unknown) {
  if (isString(value)) return value.trim();
  if (isNumber(value)) return value.toFixed(2);
  if (Array.isArray(value)) return value.length;
  if (isNil(value)) return null;
  return value;
}

// Deep equality — handles Date, Map, Set, circular references
const ok = isEqual({ a: 1 }, { a: 1 }); // true
const shallow = isEqual({ a: { x: 1 } }, { a: { x: 1 } }, { depth: 'shallow' }); // false

// Partial structural match — plain objects and arrays only
// Map/Set sources always return false
const match = isMatch({ a: 1, b: 2 }, { a: 1 }); // true
const mapSource = isMatch({ a: 1 }, new Map([['a', 1]])); // false

// isPlainObject — true for plain objects; false for class instances, Map, Set, Array
const plain = isPlainObject({ a: 1 }); // true
const notPlain = isPlainObject(new Map()); // false

// Check abort errors in fetch catch blocks
try {
  await fetch('/api/data', { signal: AbortSignal.timeout(5000) });
} catch (err) {
  if (isAbortError(err)) return; // timeout or abort — ignore
  throw err;
}

const checks = {
  isBoolean: isBoolean(true),
  isDate: isDate(new Date()),
  isDefined: isDefined(0), // true — 0 is defined
  isEmpty: isEmpty([]), // true
  isError: isError(new Error()), // true
  isFunction: isFunction(() => {}),
  isPrimitive: isPrimitive('x'), // true
};

console.log(normalize('  hi  '), ok, shallow, match, mapSource, plain, notPlain, checks);
```

```

## Standalone Predicate Pages

- [isGreaterThan](./typed/isGreaterThan.md)
- [isGreaterThanOrEqual](./typed/isGreaterThanOrEqual.md)
- [isLessThan](./typed/isLessThan.md)
- [isLessThanOrEqual](./typed/isLessThanOrEqual.md)
- [isWithin](./typed/isWithin.md)
```
