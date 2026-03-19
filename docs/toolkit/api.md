---
title: Toolkit — API Reference
description: Complete API reference for Toolkit utility functions.
---

# Toolkit API Reference

[[toc]]

## API At a Glance

| Symbol       | Purpose                                    | Execution mode | Common gotcha                                     |
| ------------ | ------------------------------------------ | -------------- | ------------------------------------------------- |
| `chunk()`    | Split arrays into fixed-size groups        | Sync           | Validate positive chunk sizes                     |
| `retry()`    | Retry async operations with delay strategy | Async          | Use bounded retries to avoid runaway loops        |
| `currency()` | Format monetary values safely              | Sync           | Match currency precision to business requirements |

## Overview

Toolkit provides **75+ utilities** organized into 10 categories. All utilities are:

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

| Utility                            | Description                          | Example                                     |
| ---------------------------------- | ------------------------------------ | ------------------------------------------- |
| [`sort`](./examples/array/sort.md) | Sort by selector or object selectors | `sort(users, { age: 'desc', name: 'asc' })` |

### Selection

| Utility                                | Description                         | Example                                       |
| -------------------------------------- | ----------------------------------- | --------------------------------------------- |
| [`pick`](./examples/array/pick.md)     | Pick and transform element          | `pick([1,2,3], x => x*2, x => x > 1)` → `4`   |
| [`select`](./examples/array/select.md) | Map non-null elements with callback | `select([null, 1, 2], x => x * 2)` → `[2, 4]` |

### Pagination

| Utility                                        | Description                                  | Example                                   |
| ---------------------------------------------- | -------------------------------------------- | ----------------------------------------- |
| [`list`](./examples/array/list.md)             | Client-side reactive pagination              | `list(data, {limit: 10})`                 |
| [`remoteList`](./examples/array/remoteList.md) | Server-side reactive pagination with caching | `remoteList({fetch: fetchFn, limit: 20})` |

## Object Utilities

**Deep operations, merging, and property manipulation.**

See [Object Examples](./examples/object.md) for detailed usage.

| Utility                                       | Description                          | Example                            |
| --------------------------------------------- | ------------------------------------ | ---------------------------------- |
| [`cache`](./examples/object/cache.md)         | Key-value cache with automatic GC    | `cache<T>()`                       |
| [`diff`](./examples/object/diff.md)           | Find differences between objects     | `diff(obj1, obj2)`                 |
| [`merge`](./examples/object/merge.md)         | Merge objects (deep/shallow/etc.)    | `merge('deep', obj1, obj2)`        |
| [`parseJSON`](./examples/object/parseJSON.md) | Safely parse JSON with fallback      | `parseJSON(str, defaultValue)`     |
| [`get`](./examples/object/path.md)            | Access nested properties safely      | `get(obj, 'user.profile.name')`    |
| [`proxy`](./examples/object/proxy.md)         | Object proxy with get/set hooks      | `proxy(obj, { set: logger })`      |
| [`prune`](./examples/object/prune.md)         | Remove null/empty values recursively | `prune({ a: 1, b: null })`         |
| [`seek`](./examples/object/seek.md)           | Search object values by similarity   | `seek(obj, 'hello', 0.8)` → `true` |

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
| [`range`](./examples/math/range.md)       | Generate number range         | `range(1, 6, 1)` → `[1,2,3,4,5]`                |
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

| Utility                                   | Description               | Example                                                     |
| ----------------------------------------- | ------------------------- | ----------------------------------------------------------- |
| [`expires`](./examples/date/expires.md)   | Check expiration status   | `expires('2030-01-01')` → `'LATER'`                         |
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

Typed checks are exposed through the `is` namespace plus `is.typeOf(...)`.

See [Typed Examples](./examples/typed.md) for detailed usage.

### `is` Namespace Methods

| Method                        | Description                                  | Example                             |
| ----------------------------- | -------------------------------------------- | ----------------------------------- |
| `is.string(value)`            | Check if value is a string                   | `is.string('x')`                    |
| `is.number(value)`            | Check if value is a number (excluding `NaN`) | `is.number(42)`                     |
| `is.boolean(value)`           | Check if value is a boolean                  | `is.boolean(false)`                 |
| `is.array(value)`             | Check if value is an array                   | `is.array([1, 2])`                  |
| `is.object(value)`            | Check if value is a plain object             | `is.object({ a: 1 })`               |
| `is.fn(value)`                | Check if value is a function                 | `is.fn(() => {})`                   |
| `is.date(value)`              | Check if value is a valid Date               | `is.date(new Date())`               |
| `is.regex(value)`             | Check if value is a RegExp                   | `is.regex(/a/)`                     |
| `is.promise(value)`           | Check if value is a Promise                  | `is.promise(Promise.resolve())`     |
| `is.defined(value)`           | Check if value is not `undefined`            | `is.defined(0)`                     |
| `is.nil(value)`               | Check if value is `null` or `undefined`      | `is.nil(null)`                      |
| `is.primitive(value)`         | Check if value is string/number/boolean      | `is.primitive('x')`                 |
| `is.empty(value)`             | Check if value is empty                      | `is.empty([])`                      |
| `is.equal(a, b)`              | Deep equality comparison                     | `is.equal({ a: 1 }, { a: 1 })`      |
| `is.match(object, source)`    | Partial deep-match                           | `is.match(user, { role: 'admin' })` |
| `is.within(value, min, max)`  | Inclusive range check                        | `is.within(5, 1, 10)`               |
| `is.even(value)`              | Check if number is even                      | `is.even(4)`                        |
| `is.odd(value)`               | Check if number is odd                       | `is.odd(3)`                         |
| `is.positive(value)`          | Check if number is positive                  | `is.positive(3)`                    |
| `is.negative(value)`          | Check if number is negative                  | `is.negative(-3)`                   |
| `is.zero(value)`              | Check if value is exactly zero               | `is.zero(0)`                        |
| `is.gt(a, b)` / `is.ge(a, b)` | Greater-than / greater-or-equal              | `is.gt(5, 3)`                       |
| `is.lt(a, b)` / `is.le(a, b)` | Less-than / less-or-equal                    | `is.le(5, 5)`                       |
| `is.typeOf(value)`            | Runtime type tag                             | `is.typeOf([]) // 'array'`          |

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

> **Note**: Error behavior is utility-specific. See each utility page for exact validation and thrown error types.
