---
title: Toolkit — API Reference
description: Complete API reference for Toolkit utility functions.
---

# Toolkit API Reference


[[toc]]

## Overview

Toolkit provides **90+ utilities** organized into 10 categories. All utilities are:

- ✅ **Type-safe** with full TypeScript inference
- ✅ **Tree-shakeable** for minimal bundle sizes
- ✅ **Isomorphic** (Browser + Node.js)
- ✅ **Well-tested** with >95% code coverage

## Quick Navigation

- [Array Utilities](#array-utilities) – Transform, filter, group, and sort arrays
- [Object Utilities](#object-utilities) – Deep operations, merging, and traversal
- [String Utilities](#string-utilities) – Formatting, casing, and manipulation
- [Function Utilities](#function-utilities) – Debounce, throttle, memoize, and more
- [Async Utilities](#async-utilities) – Async control flow, retry, and concurrency
- [Math Utilities](#math-utilities) – Statistics, calculations, and ranges
- [Money Utilities](#money-utilities) – Currency formatting and conversion
- [Date Utilities](#date-utilities) – Time intervals and differences
- [Random Utilities](#random-utilities) – Random values, shuffling, and sampling
- [Typed Utilities](#typed-utilities) – Type guards and runtime checks

## Array Utilities

**Transform, filter, and manipulate arrays with type safety.**

See [Array Examples](./examples/array.md) for detailed usage.

### Transformation

| Utility                                  | Description                               | Example                                         |
| ---------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| [`chunk`](./examples/array/chunk.md)     | Split into chunks of specific size        | `chunk([1,2,3,4,5], 2)` → `[[1,2],[3,4],[5]]`   |
| [`fold`](./examples/array/fold.md)       | Reduce to single value (no initial value) | `fold([1,2,3], (a,b) => a+b)` → `6`             |
| [`replace`](./examples/array/replace.md) | Replace first matching element            | `replace([1,2,3], x => x === 2, 0)` → `[1,0,3]` |
| [`rotate`](./examples/array/rotate.md)   | Rotate array positions                    | `rotate([1,2,3], 1)` → `[2,3,1]`                |
| [`toggle`](./examples/array/toggle.md)   | Toggle item in array (add/remove)         | `toggle([1,2], 2)` → `[1]`                      |

### Aggregation

| Utility                              | Description                       | Example                       |
| ------------------------------------ | --------------------------------- | ----------------------------- |
| [`group`](./examples/array/group.md) | Group elements by key or function | `group(users, u => u.role)`   |
| [`keyBy`](./examples/array/keyBy.md) | Index array by property           | `keyBy(users, 'id')`          |
| [`uniq`](./examples/array/uniq.md)   | Remove duplicate values           | `uniq([1,2,2,3])` → `[1,2,3]` |

### Querying

| Utility                                    | Description                   | Example                         |
| ------------------------------------------ | ----------------------------- | ------------------------------- |
| [`contains`](./examples/array/contains.md) | Check if array contains value | `contains([1,2,3], 2)` → `true` |
| [`search`](./examples/array/search.md)     | Fuzzy search in array         | `search(users, 'alice')`        |

### Sorting

| Utility                            | Description                 | Example                                   |
| ---------------------------------- | --------------------------- | ----------------------------------------- |
| [`sort`](./examples/array/sort.md) | Sort with custom comparator | `sort([3,1,2], (a,b) => a-b)` → `[1,2,3]` |

### Selection

| Utility                                | Description                | Example                                     |
| -------------------------------------- | -------------------------- | ------------------------------------------- |
| [`pick`](./examples/array/pick.md)     | Pick and transform element | `pick([1,2,3], x => x*2, x => x > 1)` → `4` |
| [`select`](./examples/array/select.md) | Map non-null elements with callback | `select([null, 1, 2], x => x * 2)` → `[2, 4]` |

### Pagination

| Utility                                        | Description                                  | Example                                   |
| ---------------------------------------------- | -------------------------------------------- | ----------------------------------------- |
| [`list`](./examples/array/list.md)             | Client-side reactive pagination              | `list(data, {limit: 10})`                 |
| [`remoteList`](./examples/array/remoteList.md) | Server-side reactive pagination with caching | `remoteList({fetch: fetchFn, limit: 20})` |

## Object Utilities

**Deep operations, merging, and property manipulation.**

See [Object Examples](./examples/object.md) for detailed usage.

| Utility                                       | Description                          | Example                          |
| --------------------------------------------- | ------------------------------------ | -------------------------------- |
| [`cache`](./examples/object/cache.md)         | Key-value cache with automatic GC    | `cache<T>()`                     |
| [`diff`](./examples/object/diff.md)           | Find differences between objects     | `diff(obj1, obj2)`               |
| [`merge`](./examples/object/merge.md)         | Merge objects (deep/shallow/etc.)    | `merge('deep', obj1, obj2)`      |
| [`parseJSON`](./examples/object/parseJSON.md) | Safely parse JSON with fallback      | `parseJSON(str, defaultValue)`   |
| [`get`](./examples/object/path.md)            | Access nested properties safely      | `get(obj, 'user.profile.name')`  |
| [`proxy`](./examples/object/proxy.md)         | Object proxy with get/set hooks      | `proxy(obj, { set: logger })`    |
| [`prune`](./examples/object/prune.md)         | Remove null/empty values recursively | `prune({ a: 1, b: null })`       |
| [`seek`](./examples/object/seek.md)           | Search object values by similarity   | `seek(obj, 'hello', 0.8)` → `true`  |

## String Utilities

**Formatting, casing, similarity, and manipulation.**

See [String Examples](./examples/string.md) for detailed usage.

### Casing

| Utility                                         | Description           | Example                                      |
| ----------------------------------------------- | --------------------- | -------------------------------------------- |
| [`camelCase`](./examples/string/camelCase.md)   | Convert to camelCase  | `camelCase('hello-world')` → `'helloWorld'`  |
| [`snakeCase`](./examples/string/snakeCase.md)   | Convert to snake_case | `snakeCase('helloWorld')` → `'hello_world'`  |
| [`kebabCase`](./examples/string/kebabCase.md)   | Convert to kebab-case | `kebabCase('helloWorld')` → `'hello-world'`  |
| [`pascalCase`](./examples/string/pascalCase.md) | Convert to PascalCase | `pascalCase('hello-world')` → `'HelloWorld'` |

### Manipulation

| Utility                                     | Description                   | Example                                  |
| ------------------------------------------- | ----------------------------- | ---------------------------------------- |
| [`truncate`](./examples/string/truncate.md) | Truncate string with ellipsis | `truncate('long text', 5)` → `'long...'` |

### Analysis

| Utility                                         | Description                 | Example                                |
| ----------------------------------------------- | --------------------------- | -------------------------------------- |
| [`similarity`](./examples/string/similarity.md) | Calculate string similarity | `similarity('hello', 'hallo')` → `0.8` |

## Function Utilities

**Control execution flow, composition, and assertions.**

See [Function Examples](./examples/function.md) for detailed usage.

| Utility                                               | Description                             | Example                                   |
| ----------------------------------------------------- | --------------------------------------- | ----------------------------------------- |
| [`assert`](./examples/function/assert.md)             | Assert condition (throws or warns)      | `assert(x > 0, 'Must be positive')`       |
| [`assertParams`](./examples/function/assertParams.md) | Assert required object keys are present | `assertParams(params, ['id', 'name'])`    |
| [`compare`](./examples/function/compare.md)           | Compare two values → -1, 0, or 1        | `compare('a', 'b')` → `-1`                |
| [`compareBy`](./examples/function/compareBy.md)       | Multi-key object comparator             | `compareBy({ name: 'asc', age: 'desc' })` |
| [`compose`](./examples/function/compose.md)           | Compose functions right-to-left         | `compose(f, g, h)`                        |
| [`curry`](./examples/function/curry.md)               | Curry function with partial application | `curry(add)(1)(2)` → `3`                  |
| [`debounce`](./examples/function/debounce.md)         | Delay execution until idle              | `debounce(fn, 300)`                       |
| [`fp`](./examples/function/fp.md)                     | Functional programming pipeline wrapper | `fp(map, double)([1,2,3])`                |
| [`memo`](./examples/function/memo.md)                 | Memoize/cache function results          | `memo(expensiveFn)`                       |
| [`once`](./examples/function/once.md)                 | Execute function only once              | `once(fn)`                                |
| [`pipe`](./examples/function/pipe.md)                 | Compose functions left-to-right         | `pipe(f, g, h)`                           |
| [`throttle`](./examples/function/throttle.md)         | Limit execution rate                    | `throttle(fn, 100)`                       |

## Async Utilities

**Async control flow, retry strategies, and concurrency primitives.**

See [Async Examples](./examples/async.md) for detailed usage.

| Utility                                    | Description                                   | Example                                           |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------------------- |
| [`attempt`](./examples/async/attempt.md)   | Execute fn with retry and error handling      | `attempt(fetchFn, { times: 3, timeout: 5000 })`   |
| [`defer`](./examples/async/defer.md)       | Create deferred promise with external control | `const { promise, resolve } = defer()`            |
| [`parallel`](./examples/async/parallel.md) | Process array with controlled concurrency     | `await parallel(5, items, asyncFn)`               |
| [`pool`](./examples/async/pool.md)         | Concurrency-limited promise pool              | `const slot = pool(3); await slot(fn)`            |
| [`queue`](./examples/async/queue.md)       | Sequential queue with concurrency control     | `const q = queue(); q.add(task)`                  |
| [`race`](./examples/async/race.md)         | Race promise with minimum delay               | `race(fetchFn(), 500)`                            |
| [`retry`](./examples/async/retry.md)       | Retry async fn with backoff                   | `retry(asyncFn, { times: 3, delay: 250 })`        |
| [`sleep`](./examples/async/sleep.md)       | Wait milliseconds                             | `await sleep(1000)`                               |
| [`waitFor`](./examples/async/waitFor.md)   | Poll condition until true                     | `await waitFor(() => isReady, { timeout: 5000 })` |

## Math Utilities

**Statistics, calculations, and number operations.**

See [Math Examples](./examples/math.md) for detailed usage.

### Arithmetic Operations

| Utility                         | Description    | Example         |
| ------------------------------- | -------------- | --------------- |
| [`abs`](./examples/math/abs.md) | Absolute value | `abs(-5)` → `5` |

### Distribution

| Utility                                       | Description               | Example                                 |
| --------------------------------------------- | ------------------------- | --------------------------------------- |
| [`allocate`](./examples/math/allocate.md)     | Distribute proportionally | `allocate(100, [1,2,3])` → `[16,33,51]` |
| [`distribute`](./examples/math/distribute.md) | Distribute evenly         | `distribute(100, 3)` → `[34,33,33]`     |

### Statistics

| Utility                                 | Description            | Example                     |
| --------------------------------------- | ---------------------- | --------------------------- |
| [`sum`](./examples/math/sum.md)         | Sum of numbers         | `sum([1,2,3])` → `6`        |
| [`average`](./examples/math/average.md) | Calculate average/mean | `average([1,2,3])` → `2`    |
| [`median`](./examples/math/median.md)   | Find median value      | `median([1,2,3,4,5])` → `3` |
| [`min`](./examples/math/min.md)         | Find minimum value     | `min([1,2,3])` → `1`        |
| [`max`](./examples/math/max.md)         | Find maximum value     | `max([1,2,3])` → `3`        |

### Number Utilities

| Utility                                   | Description                   | Example                                         |
| ----------------------------------------- | ----------------------------- | ----------------------------------------------- |
| [`clamp`](./examples/math/clamp.md)       | Clamp value to range          | `clamp(10, 0, 5)` → `5`                         |
| [`linspace`](./examples/math/linspace.md) | Evenly spaced number sequence | `linspace(0, 1, 5)` → `[0, 0.25, 0.5, 0.75, 1]` |
| [`percent`](./examples/math/percent.md)   | Calculate percentage          | `percent(25, 100)` → `25`                       |
| [`range`](./examples/math/range.md)       | Generate number range         | `range(1, 6, 1)` → `[1,2,3,4,5]`              |
| [`round`](./examples/math/round.md)       | Round to decimal places       | `round(3.14159, 2)` → `3.14`                    |

## Money Utilities

**Currency formatting and conversion with precision.**

See [Money Examples](./examples/money.md) for detailed usage.

| Utility                                    | Description                | Example                                                        |
| ------------------------------------------ | -------------------------- | -------------------------------------------------------------- |
| [`currency`](./examples/money/currency.md) | Format money for display   | `currency({amount: 123456n, currency: 'USD'})` → `'$1,234.56'` |
| [`exchange`](./examples/money/exchange.md) | Convert between currencies | `exchange(usd, {from: 'USD', to: 'EUR', rate: 0.85})`          |

## Date Utilities

**Time intervals, differences, and expiration checks.**

See [Date Examples](./examples/date.md) for detailed usage.

| Utility                                   | Description               | Example                                                 |
| ----------------------------------------- | ------------------------- | ------------------------------------------------------- |
| [`expires`](./examples/date/expires.md)   | Check expiration status   | `expires('2030-01-01')` → `'LATER'`                            |
| [`interval`](./examples/date/interval.md) | Generate date range       | `interval('2024-01-01', '2024-01-07', { interval: 'day' })` |
| [`timeDiff`](./examples/date/timeDiff.md) | Calculate time difference | `timeDiff(date1, date2)` → `{ value: 5, unit: 'day' }`      |

## Random Utilities

**Random generation, shuffling, and sampling.**

See [Random Examples](./examples/random.md) for detailed usage.

| Utility                                   | Description            | Example                        |
| ----------------------------------------- | ---------------------- | ------------------------------ |
| [`random`](./examples/random/random.md)   | Random number in range | `random(1, 10)` → `7`          |
| [`draw`](./examples/random/draw.md)       | Random array element   | `draw([1,2,3])` → `2`          |
| [`shuffle`](./examples/random/shuffle.md) | Shuffle array          | `shuffle([1,2,3])` → `[3,1,2]` |
| [`uuid`](./examples/random/uuid.md)       | Generate UUID v4       | `uuid()` → `'550e8400-...'`    |

## Typed Utilities

**Comprehensive type guards and runtime type checking.**

See [Typed Examples](./examples/typed.md) for detailed usage.

### Type Guards

| Utility                                          | Description                 | TypeScript Narrowing            |
| ------------------------------------------------ | --------------------------- | ------------------------------- |
| [`isString`](./examples/typed/isString.md)       | Check if string             | `unknown` → `string`            |
| [`isNumber`](./examples/typed/isNumber.md)       | Check if number             | `unknown` → `number`            |
| [`isBoolean`](./examples/typed/isBoolean.md)     | Check if boolean            | `unknown` → `boolean`           |
| [`isArray`](./examples/typed/isArray.md)         | Check if array              | `unknown` → `Array<unknown>`    |
| [`isObject`](./examples/typed/isObject.md)       | Check if object             | `unknown` → `object`            |
| [`isFunction`](./examples/typed/isFunction.md)   | Check if function           | `unknown` → `Function`          |
| [`isDate`](./examples/typed/isDate.md)           | Check if Date               | `unknown` → `Date`              |
| [`isRegex`](./examples/typed/isRegex.md)         | Check if RegExp             | `unknown` → `RegExp`            |
| [`isPromise`](./examples/typed/isPromise.md)     | Check if Promise            | `unknown` → `Promise<unknown>`  |
| [`isDefined`](./examples/typed/isDefined.md)     | Check if not null/undefined | `T` → `NonNullable<T>`          |
| [`isNil`](./examples/typed/isNil.md)             | Check if null or undefined  | `unknown` → `null \| undefined` |
| [`isPrimitive`](./examples/typed/isPrimitive.md) | Check if primitive type     | `unknown` → `boolean`           |

### Value Checks

| Utility                                        | Description              | Example                          |
| ---------------------------------------------- | ------------------------ | -------------------------------- |
| [`isEmpty`](./examples/typed/isEmpty.md)       | Check if empty           | `isEmpty([])` → `true`           |
| [`isEqual`](./examples/typed/isEqual.md)       | Deep equality comparison | `isEqual({a:1}, {a:1})` → `true` |
| [`isMatch`](./examples/typed/isMatch.md)       | Pattern matching         | `isMatch(obj, {role: 'admin'})`  |
| [`isWithin`](./examples/typed/isWithin.md)     | Check if number in range | `isWithin(5, 0, 10)` → `true`    |
| [`isEven`](./examples/typed/isEven.md)         | Check if even number     | `isEven(4)` → `true`             |
| [`isOdd`](./examples/typed/isOdd.md)           | Check if odd number      | `isOdd(3)` → `true`              |
| [`isPositive`](./examples/typed/isPositive.md) | Check if positive        | `isPositive(5)` → `true`         |
| [`isNegative`](./examples/typed/isNegative.md) | Check if negative        | `isNegative(-5)` → `true`        |
| [`isZero`](./examples/typed/isZero.md)         | Check if zero            | `isZero(0)` → `true`             |

### Comparison

Comparison helpers are available as methods on the [`is`](./examples/typed/is.md) namespace:

| Method       | Description      | Example                |
| ------------ | ---------------- | ---------------------- |
| `is.gt(a,b)` | Greater than     | `is.gt(5, 3)` → `true` |
| `is.ge(a,b)` | Greater or equal | `is.ge(5, 5)` → `true` |
| `is.lt(a,b)` | Less than        | `is.lt(3, 5)` → `true` |
| `is.le(a,b)` | Less or equal    | `is.le(5, 5)` → `true` |

### Multi-Purpose

| Utility                                | Description                | Example                         |
| -------------------------------------- | -------------------------- | ------------------------------- |
| [`is`](./examples/typed/is.md)         | Multi-purpose type checker | `is('string', val)` → `boolean` |
| [`typeOf`](./examples/typed/typeOf.md) | Get type of value          | `typeOf([])` → `'array'`        |

## Import Reference

### Individual Imports (Recommended)

```ts
// Best for tree-shaking — all utilities come from the main package
import { chunk, fold, group, keyBy, select } from '@vielzeug/toolkit';
import { retry, sleep, parallel } from '@vielzeug/toolkit';
import { debounce, throttle, memo } from '@vielzeug/toolkit';
import { merge, prune, diff } from '@vielzeug/toolkit';
```

## See Also

- [Usage Guide](./usage.md) – Installation and best practices
- [Examples](./examples/array.md) – Category-specific examples
- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/toolkit)

---

> **Note**: All utilities throw `TypeError` for invalid inputs. Check individual utility docs for specific error conditions and edge cases.
