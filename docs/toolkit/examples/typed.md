# 🧪 Typed Utilities

Typed utilities provide a comprehensive set of type guards and comparison helpers. These tools ensure your code remains type-safe by providing robust checks for all common JavaScript data types and values.

## 📚 Quick Reference

### Type Guards

| Method | Description |
| :--- | :--- |
| [`isString`](./typed/isString.md) | Check if a value is a string. |
| [`isNumber`](./typed/isNumber.md) | Check if a value is a number. |
| [`isArray`](./typed/isArray.md) | Check if a value is an array. |
| [`isObject`](./typed/isObject.md) | Check if a value is a plain object. |
| [`isFunction`](./typed/isFunction.md) | Check if a value is a function. |
| [`isDefined`](./typed/isDefined.md) | Check if a value is neither `null` nor `undefined`. |
| [`isNil`](./typed/isNil.md) | Check if a value is `null` or `undefined`. |
| [`isEmpty`](./typed/isEmpty.md) | Check if a value is an empty string, array, or object. |

### Comparison & Pattern Matching

| Method | Description |
| :--- | :--- |
| [`isEqual`](./typed/isEqual.md) | Perform a deep equality comparison between two values. |
| [`isMatch`](./typed/isMatch.md) | Check if an object matches a partial pattern or regex. |
| [`is`](./typed/is.md) | Multi-purpose type and value checker. |
| [`isWithin`](./typed/isWithin.md) | Check if a number is within a given range. |

## 💡 Practical Examples

### Robust Type Checking

```ts
import { isString, isArray, isNil, isDefined } from '@vielzeug/toolkit';

function process(data: unknown) {
  if (isString(data)) {
    // data is inferred as string
    return data.toUpperCase();
  }
  
  if (isArray(data)) {
    // data is inferred as any[]
    return data.length;
  }
  
  if (isNil(data)) {
    return 'N/A';
  }
}
```

### Deep Equality & Pattern Matching

```ts
import { isEqual, isMatch } from '@vielzeug/toolkit';

const user = { id: 1, name: 'Alice', settings: { theme: 'dark' } };

// Deep equality
isEqual(user, { id: 1, name: 'Alice', settings: { theme: 'dark' } }); // true

// Pattern match
isMatch(user, { settings: { theme: 'dark' } }); // true
isMatch(user, { name: /^A/ }); // true (regex support)
```

## 🔗 All Typed Utilities

<div class="grid-links">

- [is](./typed/is.md)
- [gt](./typed/gt.md)
- [ge](./typed/ge.md)
- [lt](./typed/lt.md)
- [le](./typed/le.md)
- [isArray](./typed/isArray.md)
- [isBoolean](./typed/isBoolean.md)
- [isDate](./typed/isDate.md)
- [isDefined](./typed/isDefined.md)
- [isEmpty](./typed/isEmpty.md)
- [isEqual](./typed/isEqual.md)
- [isEven](./typed/isEven.md)
- [isFunction](./typed/isFunction.md)
- [isMatch](./typed/isMatch.md)
- [isNegative](./typed/isNegative.md)
- [isNil](./typed/isNil.md)
- [isNumber](./typed/isNumber.md)
- [isObject](./typed/isObject.md)
- [isOdd](./typed/isOdd.md)
- [isPositive](./typed/isPositive.md)
- [isPrimitive](./typed/isPrimitive.md)
- [isPromise](./typed/isPromise.md)
- [isRegex](./typed/isRegex.md)
- [isString](./typed/isString.md)
- [isWithin](./typed/isWithin.md)
- [isZero](./typed/isZero.md)

</div>

<style>
.grid-links ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
  list-style: none !important;
  padding: 0 !important;
}
.grid-links li {
  margin: 0 !important;
}
</style>
