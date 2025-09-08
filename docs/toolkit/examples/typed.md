# 🧪 Typed Utilities Examples

Typed utilities help you check types, compare values, and perform predicate logic in a type-safe, ergonomic way. Use
these helpers for type checks, comparisons, and advanced predicates.

## 📚 Quick Reference

| Method      | Description                             |
| ----------- | --------------------------------------- |
| is          | General type and predicate checker      |
| gt          | Greater than comparison                 |
| ge          | Greater than or equal comparison        |
| lt          | Less than comparison                    |
| le          | Less than or equal comparison           |
| isArray     | Check if value is an array              |
| isBoolean   | Check if value is a boolean             |
| isDate      | Check if value is a Date                |
| isDefined   | Check if value is defined               |
| isEmpty     | Check if value is empty                 |
| isEqual     | Deep equality check                     |
| isEven      | Check if value is even                  |
| isFunction  | Check if value is a function            |
| isMatch     | Check if value matches a pattern/object |
| isNegative  | Check if value is negative              |
| isNil       | Check if value is null or undefined     |
| isNumber    | Check if value is a number              |
| isObject    | Check if value is an object             |
| isOdd       | Check if value is odd                   |
| isPositive  | Check if value is positive              |
| isPrimitive | Check if value is a primitive           |
| isPromise   | Check if value is a Promise             |
| isRegex     | Check if value is a RegExp              |
| isString    | Check if value is a string              |
| isWithin    | Check if value is within a range        |
| isZero      | Check if value is zero                  |

## 🔗 Granular Examples

### Type Checks

- [isArray](./typed/isArray.md)
- [isBoolean](./typed/isBoolean.md)
- [isDate](./typed/isDate.md)
- [isDefined](./typed/isDefined.md)
- [isEmpty](./typed/isEmpty.md)
- [isFunction](./typed/isFunction.md)
- [isNil](./typed/isNil.md)
- [isNumber](./typed/isNumber.md)
- [isObject](./typed/isObject.md)
- [isPrimitive](./typed/isPrimitive.md)
- [isPromise](./typed/isPromise.md)
- [isRegex](./typed/isRegex.md)
- [isString](./typed/isString.md)

### Comparison & Predicate

- [is](./typed/is.md)
- [gt](./typed/gt.md)
- [ge](./typed/ge.md)
- [lt](./typed/lt.md)
- [le](./typed/le.md)
- [isEqual](./typed/isEqual.md)
- [isEven](./typed/isEven.md)
- [isMatch](./typed/isMatch.md)
- [isNegative](./typed/isNegative.md)
- [isOdd](./typed/isOdd.md)
- [isPositive](./typed/isPositive.md)
- [isWithin](./typed/isWithin.md)
- [isZero](./typed/isZero.md)

## 💡 Example Usage

```ts
import { is, isArray, isString, isNumber, isEven, gt, isWithin } from '@vielzeug/toolkit';

// General type check
is('string', 'hello'); // true
is('array', []); // true

// Comparison
gt(5, 3); // true
isWithin(5, 1, 10); // true

// Predicate
isEven(4); // true

// Type checks
isArray([1, 2, 3]); // true
isString('abc'); // true
isNumber(123); // true
```

## 🔎 See Also

- [Array Utilities](./array.md)
- [Object Utilities](./object.md)
- [Math Utilities](./math.md)
- [Function Utilities](./function.md)
