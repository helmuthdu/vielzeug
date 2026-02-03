# Toolkit API Reference

Complete reference for all utilities available in `@vielzeug/toolkit`.

## Overview

Toolkit provides **100+ utilities** organized into 8 categories. All utilities are:

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
| [`alternate`](./examples/array/alternate.md)   | Alternate elements from multiple arrays        | `alternate([1,2],[3,4])` → `[1,3,2,4]`             |
| [`shift`](./examples/array/shift.md)           | Rotate array elements                          | `shift([1,2,3], 1)` → `[3,1,2]`                    |
| [`substitute`](./examples/array/substitute.md) | Replace elements conditionally                 | `substitute([1,2,3], x => x === 2, 0)` → `[1,0,3]` |

### Aggregation

| Utility                                      | Description                             | Example                            |
| -------------------------------------------- | --------------------------------------- | ---------------------------------- |
| [`group`](./examples/array/group.md)         | Group elements by key or function       | `group(users, u => u.role)`        |
| [`aggregate`](./examples/array/aggregate.md) | Complex aggregations (sum, count, etc.) | `aggregate(items, {sum: 'price'})` |
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
| [`search`](./examples/array/search.md)       | Search elements by query      | `search(users, 'name', 'alice')`       |

### Sorting

| Utility                                | Description                  | Example                                   |
| -------------------------------------- | ---------------------------- | ----------------------------------------- |
| [`sort`](./examples/array/sort.md)     | Sort with custom comparator  | `sort([3,1,2], (a,b) => a-b)` → `[1,2,3]` |
| [`sortBy`](./examples/array/sortBy.md) | Sort by property or function | `sortBy(users, u => u.age)`               |

### Selection

| Utility                                | Description                 | Example                              |
| -------------------------------------- | --------------------------- | ------------------------------------ |
| [`pick`](./examples/array/pick.md)     | Pick specific elements      | `pick([1,2,3,4], [0,2])` → `[1,3]`   |
| [`select`](./examples/array/select.md) | Select elements by criteria | `select(items, {category: 'books'})` |

### Utilities

| Utility                            | Description                          | Example                      |
| ---------------------------------- | ------------------------------------ | ---------------------------- |
| [`list`](./examples/array/list.md) | Create array from range or generator | `list(1, 5)` → `[1,2,3,4,5]` |

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
| [`capitalize`](./examples/string/capitalize.md) | Capitalize first letter | `capitalize('hello')` → `'Hello'`           |

### Manipulation

| Utility                                     | Description                   | Example                                       |
| ------------------------------------------- | ----------------------------- | --------------------------------------------- |
| [`truncate`](./examples/string/truncate.md) | Truncate string with ellipsis | `truncate('long text', 5)` → `'long...'`      |
| [`pad`](./examples/string/pad.md)           | Pad string to length          | `pad('5', 3, '0')` → `'005'`                  |
| [`template`](./examples/string/template.md) | Simple string templates       | `template('Hello {{name}}', {name: 'Alice'})` |

### Analysis

| Utility                                           | Description                 | Example                                  |
| ------------------------------------------------- | --------------------------- | ---------------------------------------- |
| [`similarity`](./examples/string/similarity.md)   | Calculate string similarity | `similarity('hello', 'hallo')` → `0.8`   |
| [`levenshtein`](./examples/string/levenshtein.md) | Levenshtein distance        | `levenshtein('kitten', 'sitting')` → `3` |

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
| [`compose`](./examples/function/compose.md)   | Compose functions right-to-left | `compose(f, g, h)`              |
| [`pipe`](./examples/function/pipe.md)         | Compose functions left-to-right | `pipe(f, g, h)`                 |
| [`once`](./examples/function/once.md)         | Execute function only once      | `once(fn)`                      |
| [`delay`](./examples/function/delay.md)       | Delay execution                 | `await delay(1000)`             |

---

## Math Utilities

**Statistics, calculations, and number operations.**

See [Math Examples](./examples/math.md) for detailed usage.

### Statistics

| Utility                                   | Description              | Example                     |
| ----------------------------------------- | ------------------------ | --------------------------- |
| [`sum`](./examples/math/sum.md)           | Sum of numbers           | `sum([1,2,3])` → `6`        |
| [`average`](./examples/math/average.md)   | Calculate average/mean   | `average([1,2,3])` → `2`    |
| [`median`](./examples/math/median.md)     | Find median value        | `median([1,2,3,4,5])` → `3` |
| [`mode`](./examples/math/mode.md)         | Find most frequent value | `mode([1,2,2,3])` → `2`     |
| [`variance`](./examples/math/variance.md) | Calculate variance       | `variance([1,2,3])`         |
| [`stddev`](./examples/math/stddev.md)     | Standard deviation       | `stddev([1,2,3])`           |

### Operations

| Utility                                       | Description             | Example                       |
| --------------------------------------------- | ----------------------- | ----------------------------- |
| [`clamp`](./examples/math/clamp.md)           | Clamp value to range    | `clamp(10, 0, 5)` → `5`       |
| [`range`](./examples/math/range.md)           | Generate number range   | `range(1, 5)` → `[1,2,3,4,5]` |
| [`round`](./examples/math/round.md)           | Round to decimal places | `round(3.14159, 2)` → `3.14`  |
| [`percentage`](./examples/math/percentage.md) | Calculate percentage    | `percentage(25, 100)` → `25`  |

---

## Date Utilities

**Time intervals, differences, and formatting.**

See [Date Examples](./examples/date.md) for detailed usage.

| Utility                                     | Description               | Example                      |
| ------------------------------------------- | ------------------------- | ---------------------------- |
| [`interval`](./examples/date/interval.md)   | Create time interval      | `interval('1 hour')`         |
| [`expires`](./examples/date/expires.md)     | Calculate expiration      | `expires(date, '30 days')`   |
| [`timeDiff`](./examples/date/timeDiff.md)   | Calculate time difference | `timeDiff(date1, date2)`     |
| [`isExpired`](./examples/date/isExpired.md) | Check if date is expired  | `isExpired(expiryDate)`      |
| [`format`](./examples/date/format.md)       | Format date string        | `format(date, 'YYYY-MM-DD')` |

---

## Random Utilities

**Random generation, shuffling, and sampling.**

See [Random Examples](./examples/random.md) for detailed usage.

| Utility                                             | Description               | Example                                  |
| --------------------------------------------------- | ------------------------- | ---------------------------------------- |
| [`random`](./examples/random/random.md)             | Random number in range    | `random(1, 10)` → `7`                    |
| [`randomInt`](./examples/random/randomInt.md)       | Random integer            | `randomInt(1, 10)` → `5`                 |
| [`randomItem`](./examples/random/randomItem.md)     | Random array element      | `randomItem([1,2,3])` → `2`              |
| [`shuffle`](./examples/random/shuffle.md)           | Shuffle array             | `shuffle([1,2,3])` → `[3,1,2]`           |
| [`sample`](./examples/random/sample.md)             | Random sample from array  | `sample([1,2,3,4,5], 3)`                 |
| [`uuid`](./examples/random/uuid.md)                 | Generate UUID v4          | `uuid()` → `'550e8400-...'`              |
| [`randomString`](./examples/random/randomString.md) | Random string             | `randomString(10)` → `'aBc123XyZ9'`      |
| [`weighted`](./examples/random/weighted.md)         | Weighted random selection | `weighted([{val: 'a', weight: 2}, ...])` |

---

## Typed Utilities

**Comprehensive type guards and runtime type checking.**

See [Typed Examples](./examples/typed.md) for detailed usage.

### Primitives

| Utility                                          | Description                | TypeScript Narrowing            |
| ------------------------------------------------ | -------------------------- | ------------------------------- |
| [`isString`](./examples/typed/isString.md)       | Check if string            | `unknown` → `string`            |
| [`isNumber`](./examples/typed/isNumber.md)       | Check if number            | `unknown` → `number`            |
| [`isBoolean`](./examples/typed/isBoolean.md)     | Check if boolean           | `unknown` → `boolean`           |
| [`isSymbol`](./examples/typed/isSymbol.md)       | Check if symbol            | `unknown` → `symbol`            |
| [`isBigInt`](./examples/typed/isBigInt.md)       | Check if bigint            | `unknown` → `bigint`            |
| [`isNull`](./examples/typed/isNull.md)           | Check if null              | `unknown` → `null`              |
| [`isUndefined`](./examples/typed/isUndefined.md) | Check if undefined         | `unknown` → `undefined`         |
| [`isNullish`](./examples/typed/isNullish.md)     | Check if null or undefined | `unknown` → `null \| undefined` |

### Objects & Collections

| Utility                                      | Description      | TypeScript Narrowing         |
| -------------------------------------------- | ---------------- | ---------------------------- |
| [`isObject`](./examples/typed/isObject.md)   | Check if object  | `unknown` → `object`         |
| [`isArray`](./examples/typed/isArray.md)     | Check if array   | `unknown` → `Array<unknown>` |
| [`isDate`](./examples/typed/isDate.md)       | Check if Date    | `unknown` → `Date`           |
| [`isRegExp`](./examples/typed/isRegExp.md)   | Check if RegExp  | `unknown` → `RegExp`         |
| [`isMap`](./examples/typed/isMap.md)         | Check if Map     | `unknown` → `Map`            |
| [`isSet`](./examples/typed/isSet.md)         | Check if Set     | `unknown` → `Set`            |
| [`isWeakMap`](./examples/typed/isWeakMap.md) | Check if WeakMap | `unknown` → `WeakMap`        |
| [`isWeakSet`](./examples/typed/isWeakSet.md) | Check if WeakSet | `unknown` → `WeakSet`        |

### Functions & Special

| Utility                                        | Description       | TypeScript Narrowing           |
| ---------------------------------------------- | ----------------- | ------------------------------ |
| [`isFunction`](./examples/typed/isFunction.md) | Check if function | `unknown` → `Function`         |
| [`isPromise`](./examples/typed/isPromise.md)   | Check if Promise  | `unknown` → `Promise<unknown>` |
| [`isError`](./examples/typed/isError.md)       | Check if Error    | `unknown` → `Error`            |

### Composite Checks

| Utility                                              | Description                                  |
| ---------------------------------------------------- | -------------------------------------------- |
| [`isEmpty`](./examples/typed/isEmpty.md)             | Check if empty (array, object, string, etc.) |
| [`isPrimitive`](./examples/typed/isPrimitive.md)     | Check if primitive type                      |
| [`isPlainObject`](./examples/typed/isPlainObject.md) | Check if plain object (not class instance)   |

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
