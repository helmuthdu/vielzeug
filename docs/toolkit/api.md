# Toolkit API Reference

Complete reference for all utilities available in `@vielzeug/toolkit`.

## Overview

Toolkit provides **110+ utilities** organized into 9 categories. All utilities are:

- ✅ **Type-safe** with full TypeScript inference
- ✅ **Tree-shakeable** for minimal bundle sizes
- ✅ **Isomorphic** (Browser + Node.js)
- ✅ **Well-tested** with >95% code coverage

## Quick Navigation

- [Array Utilities](#array-utilities) - Transform, filter, group, and sort arrays
- [Object Utilities](#object-utilities) - Deep operations, merging, and traversal
- [String Utilities](#string-utilities) - Formatting, casing, and manipulation
- [Function Utilities](#function-utilities) - Debounce, throttle, memoize, and retry
- [Math Utilities](#math-utilities) - Statistics, calculations, and ranges
- [Money Utilities](#money-utilities) - Currency formatting and conversion
- [Date Utilities](#date-utilities) - Time intervals and differences
- [Random Utilities](#random-utilities) - Random values, shuffling, and sampling
- [Typed Utilities](#typed-utilities) - Type guards and runtime checks

---

## Array Utilities

**Transform, filter, and manipulate arrays with type safety.**

See [Array Examples](./examples/array.md) for detailed usage.

### Transformation

| Utility                                        | Description                                    | Example                                            |
| ---------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| [`map`](./examples/array/map.md)               | Transform each element (async supported)       | `map([1,2,3], x => x*2)` → `[2,4,6]`               |
| [`filter`](./examples/array/filter.md)         | Filter elements by predicate (async supported) | `filter([1,2,3], x => x > 1)` → `[2,3]`            |
| [`reduce`](./examples/array/reduce.md)         | Reduce array to single value                   | `reduce([1,2,3], (a,b) => a+b)` → `6`              |
| [`chunk`](./examples/array/chunk.md)           | Split into chunks of specific size             | `chunk([1,2,3,4,5], 2)` → `[[1,2],[3,4],[5]]`      |
| [`flatten`](./examples/array/flatten.md)       | Flatten nested arrays                          | `flatten([[1,2],[3,4]])` → `[1,2,3,4]`             |
| [`compact`](./examples/array/compact.md)       | Remove null/undefined values                   | `compact([1,null,2])` → `[1,2]`                    |
| [`alternate`](./examples/array/alternate.md)   | Toggle item in array (add/remove)              | `alternate([1,2], 2)` → `[1]`                      |
| [`shift`](./examples/array/shift.md)           | Rotate array elements                          | `shift([1,2,3], 1)` → `[2,3,1]`                    |
| [`substitute`](./examples/array/substitute.md) | Replace elements conditionally                 | `substitute([1,2,3], x => x === 2, 0)` → `[1,0,3]` |

### Aggregation

| Utility                                      | Description                             | Example                            |
| -------------------------------------------- | --------------------------------------- | ---------------------------------- |
| [`group`](./examples/array/group.md)         | Group elements by key or function       | `group(users, u => u.role)`        |
| [`aggregate`](./examples/array/aggregate.md) | Aggregate array to object by key        | `aggregate(items, 'id')`           |
| [`uniq`](./examples/array/uniq.md)           | Remove duplicate values                 | `uniq([1,2,2,3])` → `[1,2,3]`      |

### Querying

| Utility                                      | Description                   | Example                                |
| -------------------------------------------- | ----------------------------- | -------------------------------------- |
| [`find`](./examples/array/find.md)           | Find first matching element   | `find([1,2,3], x => x > 1)` → `2`      |
| [`findIndex`](./examples/array/findIndex.md) | Find index of first match     | `findIndex([1,2,3], x => x > 1)` → `1` |
| [`findLast`](./examples/array/findLast.md)   | Find last matching element    | `findLast([1,2,3], x => x > 1)` → `3`  |
| [`some`](./examples/array/some.md)           | Check if any element matches  | `some([1,2,3], x => x > 2)` → `true`   |
| [`every`](./examples/array/every.md)         | Check if all elements match   | `every([1,2,3], x => x > 0)` → `true`  |
| [`contains`](./examples/array/contains.md)   | Check if array contains value | `contains([1,2,3], 2)` → `true`        |
| [`search`](./examples/array/search.md)       | Fuzzy search in array         | `search(users, 'alice')`               |

### Sorting

| Utility                                | Description                  | Example                                   |
| -------------------------------------- | ---------------------------- | ----------------------------------------- |
| [`sort`](./examples/array/sort.md)     | Sort with custom comparator  | `sort([3,1,2], (a,b) => a-b)` → `[1,2,3]` |
| [`arrange`](./examples/array/arrange.md) | Sort by property or function | `arrange(users, {age: 'asc'})`             |

### Selection

| Utility                                | Description                 | Example                                       |
| -------------------------------------- | --------------------------- | --------------------------------------------- |
| [`pick`](./examples/array/pick.md)     | Pick and transform element  | `pick([1,2,3], x => x*2, x => x > 1)` → `4`   |
| [`select`](./examples/array/select.md) | Map and filter in one step  | `select([1,2,3], x => x > 1 ? x*2 : null)`    |

### Pagination

| Utility                                          | Description                                  | Example                                   |
| ------------------------------------------------ | -------------------------------------------- | ----------------------------------------- |
| [`list`](./examples/array/list.md)               | Client-side reactive pagination              | `list(data, {limit: 10})`                 |
| [`remoteList`](./examples/array/remoteList.md)   | Server-side reactive pagination with caching | `remoteList({fetch: fetchFn, limit: 20})` |

---

## Object Utilities

**Deep operations, merging, and property manipulation.**

See [Object Examples](./examples/object.md) for detailed usage.

| Utility                                       | Description                          | Example                          |
| --------------------------------------------- | ------------------------------------ | -------------------------------- |
| [`clone`](./examples/object/clone.md)         | Deep clone an object                 | `clone({a: {b: 1}})`             |
| [`merge`](./examples/object/merge.md)         | Merge objects (deep/shallow/etc.)    | `merge('deep', obj1, obj2)`      |
| [`diff`](./examples/object/diff.md)           | Find differences between objects     | `diff(obj1, obj2)`               |
| [`path`](./examples/object/path.md)           | Access nested properties safely      | `path(obj, 'user.profile.name')` |
| [`seek`](./examples/object/seek.md)           | Find value by key anywhere in object | `seek(obj, 'email')`             |
| [`parseJSON`](./examples/object/parseJSON.md) | Safely parse JSON with fallback      | `parseJSON(str, defaultValue)`   |
| [`keys`](./examples/object/keys.md)           | Type-safe Object.keys()              | `keys(obj)`                      |
| [`values`](./examples/object/values.md)       | Type-safe Object.values()            | `values(obj)`                    |
| [`entries`](./examples/object/entries.md)     | Type-safe Object.entries()           | `entries(obj)`                   |

---

## String Utilities

**Formatting, casing, similarity, and manipulation.**

See [String Examples](./examples/string.md) for detailed usage.

### Casing

| Utility                                         | Description             | Example                                     |
| ----------------------------------------------- | ----------------------- | ------------------------------------------- |
| [`camelCase`](./examples/string/camelCase.md)   | Convert to camelCase    | `camelCase('hello-world')` → `'helloWorld'` |
| [`snakeCase`](./examples/string/snakeCase.md)   | Convert to snake_case   | `snakeCase('helloWorld')` → `'hello_world'` |
| [`kebabCase`](./examples/string/kebabCase.md)   | Convert to kebab-case   | `kebabCase('helloWorld')` → `'hello-world'` |
| [`pascalCase`](./examples/string/pascalCase.md) | Convert to PascalCase   | `pascalCase('hello-world')` → `'HelloWorld'`|

### Manipulation

| Utility                                     | Description                   | Example                                  |
| ------------------------------------------- | ----------------------------- | ---------------------------------------- |
| [`truncate`](./examples/string/truncate.md) | Truncate string with ellipsis | `truncate('long text', 5)` → `'long...'` |

### Analysis

| Utility                                         | Description                 | Example                                |
| ----------------------------------------------- | --------------------------- | -------------------------------------- |
| [`similarity`](./examples/string/similarity.md) | Calculate string similarity | `similarity('hello', 'hallo')` → `0.8` |

---

## Function Utilities

**Control execution timing and behavior.**

See [Function Examples](./examples/function.md) for detailed usage.

| Utility                                       | Description                     | Example                         |
| --------------------------------------------- | ------------------------------- | ------------------------------- |
| [`debounce`](./examples/function/debounce.md) | Delay execution until idle      | `debounce(fn, 300)`             |
| [`throttle`](./examples/function/throttle.md) | Limit execution rate            | `throttle(fn, 100)`             |
| [`memo`](./examples/function/memo.md)         | Memoize/cache function results  | `memo(expensiveFn)`             |
| [`retry`](./examples/function/retry.md)       | Retry failed operations         | `retry(asyncFn, {attempts: 3})` |
| [`parallel`](./examples/function/parallel.md) | Process array with controlled concurrency | `parallel(5, items, asyncFn)` |
| [`compose`](./examples/function/compose.md)   | Compose functions right-to-left | `compose(f, g, h)`              |
| [`pipe`](./examples/function/pipe.md)         | Compose functions left-to-right | `pipe(f, g, h)`                 |
| [`once`](./examples/function/once.md)         | Execute function only once      | `once(fn)`                      |
| [`delay`](./examples/function/delay.md)       | Delay execution                 | `await delay(1000)`             |
| [`prune`](./examples/function/prune.md)       | Remove nullable/empty values    | `prune({ a: 1, b: null })` → `{ a: 1 }` |

---

## Math Utilities

**Statistics, calculations, and number operations.**

See [Math Examples](./examples/math.md) for detailed usage.

### Arithmetic Operations

| Utility                                 | Description                    | Example                        |
| --------------------------------------- | ------------------------------ | ------------------------------ |
| [`add`](./examples/math/add.md)         | Add two numbers                | `add(10, 20)` → `30`           |
| [`subtract`](./examples/math/subtract.md) | Subtract numbers             | `subtract(20, 10)` → `10`      |
| [`multiply`](./examples/math/multiply.md) | Multiply numbers             | `multiply(10, 5)` → `50`       |
| [`divide`](./examples/math/divide.md)   | Divide numbers                 | `divide(20, 5)` → `4`          |
| [`abs`](./examples/math/abs.md)         | Absolute value                 | `abs(-5)` → `5`                |

### Distribution

| Utility                                     | Description                    | Example                        |
| ------------------------------------------- | ------------------------------ | ------------------------------ |
| [`allocate`](./examples/math/allocate.md)   | Distribute proportionally      | `allocate(100, [1,2,3])` → `[16,33,51]` |
| [`distribute`](./examples/math/distribute.md) | Distribute evenly            | `distribute(100, 3)` → `[34,33,33]` |

### Statistics

| Utility                                 | Description              | Example                        |
| --------------------------------------- | ------------------------ | ------------------------------ |
| [`sum`](./examples/math/sum.md)         | Sum of numbers           | `sum([1,2,3])` → `6`           |
| [`average`](./examples/math/average.md) | Calculate average/mean   | `average([1,2,3])` → `2`       |
| [`median`](./examples/math/median.md)   | Find median value        | `median([1,2,3,4,5])` → `3`    |
| [`min`](./examples/math/min.md)         | Find minimum value       | `min([1,2,3])` → `1`           |
| [`max`](./examples/math/max.md)         | Find maximum value       | `max([1,2,3])` → `3`           |

### Number Utilities

| Utility                                 | Description              | Example                        |
| --------------------------------------- | ------------------------ | ------------------------------ |
| [`clamp`](./examples/math/clamp.md)     | Clamp value to range     | `clamp(10, 0, 5)` → `5`        |
| [`range`](./examples/math/range.md)     | Generate number range    | `range(1, 5)` → `[1,2,3,4,5]`  |
| [`round`](./examples/math/round.md)     | Round to decimal places  | `round(3.14159, 2)` → `3.14`   |
| [`rate`](./examples/math/rate.md)       | Calculate percentage     | `rate(25, 100)` → `25`         |
| [`boil`](./examples/math/boil.md)       | Reduce with comparator   | `boil([1,2,3], (a,b) => a+b)`  |

---

## Money Utilities

**Currency formatting and conversion with precision.**

See [Money Examples](./examples/money.md) for detailed usage.

| Utility                                     | Description                    | Example                        |
| ------------------------------------------- | ------------------------------ | ------------------------------ |
| [`currency`](./examples/money/currency.md)  | Format money for display       | `currency({amount: 123456n, currency: 'USD'})` → `'$1,234.56'` |
| [`exchange`](./examples/money/exchange.md)  | Convert between currencies     | `exchange(usd, {from: 'USD', to: 'EUR', rate: 0.85})` |

---

## Date Utilities

**Time intervals, differences, and expiration checks.**

See [Date Examples](./examples/date.md) for detailed usage.

| Utility                                   | Description                  | Example                                              |
| ----------------------------------------- | ---------------------------- | ---------------------------------------------------- |
| [`expires`](./examples/date/expires.md)   | Check expiration status      | `expires('2026-01-01')` → `'SOON'`                   |
| [`interval`](./examples/date/interval.md) | Generate date range          | `interval('2024-01-01', '2024-01-31', {interval: 'D'})` |
| [`timeDiff`](./examples/date/timeDiff.md) | Calculate time difference    | `timeDiff(date1, date2)` → `{value: 5, unit: 'DAY'}` |

---

## Random Utilities

**Random generation, shuffling, and sampling.**

See [Random Examples](./examples/random.md) for detailed usage.

| Utility                                 | Description           | Example                     |
| --------------------------------------- | --------------------- | --------------------------- |
| [`random`](./examples/random/random.md) | Random number in range| `random(1, 10)` → `7`       |
| [`draw`](./examples/random/draw.md)     | Random array element  | `draw([1,2,3])` → `2`       |
| [`shuffle`](./examples/random/shuffle.md) | Shuffle array       | `shuffle([1,2,3])` → `[3,1,2]` |
| [`uuid`](./examples/random/uuid.md)     | Generate UUID v4      | `uuid()` → `'550e8400-...'` |

---

## Typed Utilities

**Comprehensive type guards and runtime type checking.**

See [Typed Examples](./examples/typed.md) for detailed usage.

### Type Guards

| Utility                                        | Description                | TypeScript Narrowing            |
| ---------------------------------------------- | -------------------------- | ------------------------------- |
| [`isString`](./examples/typed/isString.md)     | Check if string            | `unknown` → `string`            |
| [`isNumber`](./examples/typed/isNumber.md)     | Check if number            | `unknown` → `number`            |
| [`isBoolean`](./examples/typed/isBoolean.md)   | Check if boolean           | `unknown` → `boolean`           |
| [`isArray`](./examples/typed/isArray.md)       | Check if array             | `unknown` → `Array<unknown>`    |
| [`isObject`](./examples/typed/isObject.md)     | Check if object            | `unknown` → `object`            |
| [`isFunction`](./examples/typed/isFunction.md) | Check if function          | `unknown` → `Function`          |
| [`isDate`](./examples/typed/isDate.md)         | Check if Date              | `unknown` → `Date`              |
| [`isRegex`](./examples/typed/isRegex.md)       | Check if RegExp            | `unknown` → `RegExp`            |
| [`isPromise`](./examples/typed/isPromise.md)   | Check if Promise           | `unknown` → `Promise<unknown>`  |
| [`isDefined`](./examples/typed/isDefined.md)   | Check if not null/undefined| `T` → `NonNullable<T>`          |
| [`isNil`](./examples/typed/isNil.md)           | Check if null or undefined | `unknown` → `null \| undefined` |
| [`isPrimitive`](./examples/typed/isPrimitive.md) | Check if primitive type  | `unknown` → `boolean`           |

### Value Checks

| Utility                                      | Description                   | Example                          |
| -------------------------------------------- | ----------------------------- | -------------------------------- |
| [`isEmpty`](./examples/typed/isEmpty.md)     | Check if empty                | `isEmpty([])` → `true`           |
| [`isEqual`](./examples/typed/isEqual.md)     | Deep equality comparison      | `isEqual({a:1}, {a:1})` → `true` |
| [`isMatch`](./examples/typed/isMatch.md)     | Pattern matching              | `isMatch(obj, {role: 'admin'})`  |
| [`isWithin`](./examples/typed/isWithin.md)   | Check if number in range      | `isWithin(5, 0, 10)` → `true`    |
| [`isEven`](./examples/typed/isEven.md)       | Check if even number          | `isEven(4)` → `true`             |
| [`isOdd`](./examples/typed/isOdd.md)         | Check if odd number           | `isOdd(3)` → `true`              |
| [`isPositive`](./examples/typed/isPositive.md) | Check if positive           | `isPositive(5)` → `true`         |
| [`isNegative`](./examples/typed/isNegative.md) | Check if negative           | `isNegative(-5)` → `true`        |
| [`isZero`](./examples/typed/isZero.md)       | Check if zero                 | `isZero(0)` → `true`             |

### Comparison

| Utility                            | Description            | Example                    |
| ---------------------------------- | ---------------------- | -------------------------- |
| [`gt`](./examples/typed/gt.md)     | Greater than           | `gt(5, 3)` → `true`        |
| [`ge`](./examples/typed/ge.md)     | Greater or equal       | `ge(5, 5)` → `true`        |
| [`lt`](./examples/typed/lt.md)     | Less than              | `lt(3, 5)` → `true`        |
| [`le`](./examples/typed/le.md)     | Less or equal          | `le(5, 5)` → `true`        |

### Multi-Purpose

| Utility                              | Description                      | Example                       |
| ------------------------------------ | -------------------------------- | ----------------------------- |
| [`is`](./examples/typed/is.md)       | Multi-purpose type checker       | `is('string', val)` → `boolean` |
| [`typeOf`](./examples/typed/typeOf.md) | Get type of value              | `typeOf([])` → `'array'`      |

---

## Import Reference

### Individual Imports (Recommended)

```ts
// Best for tree-shaking
import { map, filter, group } from '@vielzeug/toolkit';
```

### Category Imports

```ts
import { chunk, map } from '@vielzeug/toolkit/array';
import { merge, clone } from '@vielzeug/toolkit/object';
import { camelCase } from '@vielzeug/toolkit/string';
import { debounce } from '@vielzeug/toolkit/function';
import { sum, average } from '@vielzeug/toolkit/math';
import { interval } from '@vielzeug/toolkit/date';
import { random, uuid } from '@vielzeug/toolkit/random';
import { isString, isArray } from '@vielzeug/toolkit/typed';
```

---

## See Also

- [Usage Guide](./usage.md) - Installation and best practices
- [Examples](./examples/array.md) - Category-specific examples
- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/toolkit)

---

> **Note**: All utilities throw `TypeError` for invalid inputs. Check individual utility docs for specific error conditions and edge cases.
