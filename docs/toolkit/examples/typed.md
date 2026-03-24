---
title: 'Toolkit — Type Guard Examples'
description: 'Type guard utility examples for Toolkit.'
---

# Typed Utilities

Typed utilities are bundled in a single `is` namespace export. Every check is a method on `is`, so a single import gives you complete type-guard coverage with excellent TypeScript narrowing.

```ts
import { is } from '@vielzeug/toolkit';
```

## 📚 Quick Reference

## Problem

Implement 📚 quick reference in a production-friendly way with `@vielzeug/toolkit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/toolkit` installed.

### Type Guards

| Method            | Description                                                      |
| :---------------- | :--------------------------------------------------------------- |
| `is.string(v)`    | Check if a value is a string.                                    |
| `is.number(v)`    | Check if a value is a number.                                    |
| `is.boolean(v)`   | Check if a value is a boolean.                                   |
| `is.array(v)`     | Check if a value is an array.                                    |
| `is.object(v)`    | Check if a value is a plain object.                              |
| `is.fn(v)`        | Check if a value is a function.                                  |
| `is.defined(v)`   | Check if a value is neither `null` nor `undefined`.              |
| `is.nil(v)`       | Check if a value is `null` or `undefined`.                       |
| `is.empty(v)`     | Check if a value is an empty string, array, or object.           |
| `is.date(v)`      | Check if a value is a `Date` instance.                           |
| `is.regex(v)`     | Check if a value is a `RegExp` instance.                         |
| `is.promise(v)`   | Check if a value is a `Promise`.                                 |
| `is.primitive(v)` | Check if a value is a primitive (string, number, boolean, etc.). |
| `is.typeOf(v, t)` | Check the `typeof` a value against a string tag.                 |

### Value Checks

| Method            | Description                                            |
| :---------------- | :----------------------------------------------------- |
| `is.equal(a, b)`  | Deep equality comparison between two values.           |
| `is.match(v, p)`  | Check if an object matches a partial pattern or regex. |
| `is.within(v, r)` | Check if a number is within a given range.             |
| `is.even(v)`      | Check if a number is even.                             |
| `is.odd(v)`       | Check if a number is odd.                              |
| `is.zero(v)`      | Check if a value is `0`.                               |
| `is.positive(v)`  | Check if a number is positive.                         |
| `is.negative(v)`  | Check if a number is negative.                         |

### Comparison Helpers

| Method        | Description                       |
| :------------ | :-------------------------------- |
| `is.gt(a, b)` | Greater than (`a > b`).           |
| `is.ge(a, b)` | Greater than or equal (`a >= b`). |
| `is.lt(a, b)` | Less than (`a < b`).              |
| `is.le(a, b)` | Less than or equal (`a <= b`).    |

## 💡 Practical Examples

### Robust Type Checking

```ts
import { is } from '@vielzeug/toolkit';

function process(data: unknown) {
  if (is.string(data)) {
    // data is narrowed to string
    return data.toUpperCase();
  }

  if (is.array(data)) {
    // data is narrowed to any[]
    return data.length;
  }

  if (is.nil(data)) {
    return 'N/A';
  }
}
```

### Deep Equality & Pattern Matching

```ts
import { is } from '@vielzeug/toolkit';

const user = { id: 1, name: 'Alice', settings: { theme: 'dark' } };

// Deep equality
is.equal(user, { id: 1, name: 'Alice', settings: { theme: 'dark' } }); // true

// Partial pattern match
is.match(user, { settings: { theme: 'dark' } }); // true
is.match(user, { name: /^A/ }); // true (regex support)
```

### Comparison Helpers

```ts
import { is } from '@vielzeug/toolkit';

is.gt(5, 3); // true  (5 > 3)
is.ge(5, 5); // true  (5 >= 5)
is.lt(2, 10); // true  (2 < 10)
is.le(4, 4); // true  (4 <= 4)
is.within(7, [1, 10]); // true
```

### Numeric Checks

```ts
import { is } from '@vielzeug/toolkit';

is.even(4); // true
is.odd(7); // true
is.positive(1); // true
is.negative(-3); // true
is.zero(0); // true
```

## 🔗 All Typed Utilities

<div class="grid-links">

- [is](./typed/is.md)
- [is.array](./typed/isArray.md)
- [is.boolean](./typed/isBoolean.md)
- [is.date](./typed/isDate.md)
- [is.defined](./typed/isDefined.md)
- [is.empty](./typed/isEmpty.md)
- [is.equal](./typed/isEqual.md)
- [is.even](./typed/isEven.md)
- [is.fn](./typed/isFunction.md)
- [is.match](./typed/isMatch.md)
- [is.negative](./typed/isNegative.md)
- [is.nil](./typed/isNil.md)
- [is.number](./typed/isNumber.md)
- [is.object](./typed/isObject.md)
- [is.odd](./typed/isOdd.md)
- [is.positive](./typed/isPositive.md)
- [is.primitive](./typed/isPrimitive.md)
- [is.promise](./typed/isPromise.md)
- [is.regex](./typed/isRegex.md)
- [is.string](./typed/isString.md)
- [is.within](./typed/isWithin.md)
- [is.zero](./typed/isZero.md)
- [is.typeOf](./typed/typeOf.md)

</div>

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Array Examples](./array.md)
- [Async Examples](./async.md)
- [Date Examples](./date.md)
