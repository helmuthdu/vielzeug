# @vielzeug/toolkit

> Typed utility functions for everyday TypeScript — arrays, objects, strings, async, dates, math, and more

[![npm version](https://img.shields.io/npm/v/@vielzeug/toolkit)](https://www.npmjs.com/package/@vielzeug/toolkit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Toolkit** is a tree-shakeable collection of TypeScript utility functions covering arrays, objects, strings, async control-flow, dates, math, money, and type guards — all individually importable with full type inference and zero dependencies.

## Installation

```sh
pnpm add @vielzeug/toolkit
# npm install @vielzeug/toolkit
# yarn add @vielzeug/toolkit
```

## Quick Start

```typescript
import { group, chunk, debounce, retry, merge, uuid, is } from '@vielzeug/toolkit';

// Group an array by a key
const byStatus = group(users, (u) => u.status);
// { active: [...], inactive: [...] }

// Split array into chunks
const pages = chunk([1, 2, 3, 4, 5], 2); // [[1,2],[3,4],[5]]

// Debounce an event handler
const handleSearch = debounce((query: string) => fetchResults(query), 300);

// Retry a failing async function
const result = await retry(() => fetchData(), { times: 3, delay: 200 });

// Deep merge objects
const config = merge('deep', defaults, overrides);

// Generate a UUID
const id = uuid(); // e.g. "550e8400-e29b-41d4-a716-446655440000"

// Runtime type checks
if (is.string(value)) { /* value narrowed to string */ }
```

## Features

- ✅ **Tree-shakeable** — import only what you use
- ✅ **Type-safe** — full TypeScript inference on every utility
- ✅ **Array** — `chunk`, `group`, `keyBy`, `fold`, `select`, `toggle`, `rotate`, `replace`, `search`, `uniq`, `sort`, `contains`, `pick`, `list`, `remoteList`
- ✅ **Object** — `merge`, `diff`, `get`, `seek`, `prune`, `proxy`, `cache`, `parseJSON`
- ✅ **String** — `camelCase`, `kebabCase`, `pascalCase`, `snakeCase`, `truncate`, `similarity`
- ✅ **Async** — `retry`, `sleep`, `parallel`, `pool`, `queue`, `race`, `attempt`, `defer`, `waitFor`
- ✅ **Function** — `debounce`, `throttle`, `memo`, `once`, `pipe`, `compose`, `curry`, `compare`, `fp`
- ✅ **Math** — `sum`, `average`, `median`, `min`, `max`, `clamp`, `round`, `range`, `percent`, `linspace`, `allocate`, `distribute`
- ✅ **Date** — `timeDiff`, `interval`, `expires`
- ✅ **Money** — `currency`, `exchange`
- ✅ **Random** — `uuid`, `random`, `draw`, `shuffle`
- ✅ **Type guards** — `is.string`, `is.number`, `is.array`, `is.nil`, `is.equal`, `is.match`, and more
- ✅ **Zero dependencies**

## Usage

### Array Utilities

```typescript
import { group, chunk, keyBy, fold, select, toggle, uniq, sort } from '@vielzeug/toolkit';

// Group by key
const byRole = group(users, (u) => u.role);     // { admin: [...], user: [...] }

// Split into chunks
const pages = chunk(items, 10);                  // Item[][]

// Index by key
const byId = keyBy(users, 'id');                 // { '1': user1, '2': user2 }

// Fold (reduce without initial value)
fold([1, 2, 3], (a, b) => a + b);               // 6

// Filter nil elements from source, then map remaining
select([null, 1, null, 2], (n) => n * 10); // [10, 20]

// Filter by predicate, then map
select([1, 2, 3, 4], (n) => n * 10, (n) => n > 2); // [30, 40]

// Toggle item in/out of array
toggle([1, 2, 3], 2);                            // [1, 3]
toggle([1, 2, 3], 4);                            // [1, 2, 3, 4]

// Sort by selector (single-field)
sort([{ value: 3 }, { value: 1 }], (item) => item.value); // [{ value: 1 }, { value: 3 }]

// Sort by object selectors (multi-field)
sort(
  [
	{ age: 30, name: 'Bob' },
	{ age: 30, name: 'Alice' },
	{ age: 25, name: 'Chris' },
  ],
  { age: 'desc', name: 'asc' },
);

// Remove duplicates
uniq([1, 2, 2, 3]);                              // [1, 2, 3]
```

### Object Utilities

```typescript
import { merge, diff, get, seek, prune, parseJSON } from '@vielzeug/toolkit';

// Deep merge
const cfg = merge('deep', { api: { host: 'localhost' } }, { api: { port: 3000 } });
// { api: { host: 'localhost', port: 3000 } }

// Nested path access
get(cfg, 'api.host');   // 'localhost'

// Recursively search object values by similarity
seek(cfg, 'localhost', 1);   // true (exact match)

// Remove nulls/empty values
prune({ a: 1, b: null, c: '' });  // { a: 1 }

// Safe JSON parse
parseJSON('{"a":1}', {});  // { a: 1 }
parseJSON('bad json', {}); // {}
```

### Async Utilities

```typescript
import { retry, sleep, parallel, pool, race, attempt, waitFor } from '@vielzeug/toolkit';

// Retry with backoff
const result = await retry(() => fetchData(), { times: 3, delay: 200, backoff: 2 });

// Delay
await sleep(500);

// Process items with concurrency limit
const results = await parallel(5, urls, async (url) => fetch(url).then((r) => r.json()));

// Race promise against minimum delay (prevents loading flicker)
const data = await race(fetchUser(id), 300);

// Attempt with explicit success/failure handling
const userAttempt = await attempt(fetchUser, { times: 2, timeout: 5000 });
if (userAttempt.ok) {
  console.log(userAttempt.value);
} else {
  console.error(userAttempt.error);
}

// Poll until condition is true
await waitFor(() => document.querySelector('#app') !== null, { timeout: 5000 });
```

### String Utilities

```typescript
import { camelCase, kebabCase, snakeCase, pascalCase, truncate, similarity } from '@vielzeug/toolkit';

camelCase('hello-world');          // 'helloWorld'
kebabCase('helloWorld');           // 'hello-world'
snakeCase('helloWorld');           // 'hello_world'
pascalCase('hello-world');         // 'HelloWorld'
truncate('A very long string', 10); // 'A very lon...'
similarity('hello', 'hallo');      // ~0.8
```

### Function Utilities

```typescript
import { memo, once, pipe, debounce, throttle, compare } from '@vielzeug/toolkit';

const fib    = memo((n: number): number => n <= 1 ? n : fib(n - 1) + fib(n - 2));
const init   = once(() => bootstrap());
const process = pipe(trim, normalize, validate);
const search = debounce(fetchResults, 300);
const scroll = throttle(updatePosition, 16);

// Compare → always -1 | 0 | 1 (safe for sort)
compare(1, 2);   // -1
compare('b', 'a'); // 1
```

### Math Utilities

```typescript
import { sum, average, clamp, round, range, percent, linspace } from '@vielzeug/toolkit';

sum([1, 2, 3, 4]);          // 10
average([10, 20, 30]);      // 20
clamp(105, 0, 100);         // 100
round(Math.PI, 4);          // 3.1416
range(1, 6, 1);              // [1, 2, 3, 4, 5]
percent(25, 100);           // 25
linspace(0, 10, 5);         // [0, 2.5, 5, 7.5, 10]
```

### Date Utilities

```typescript
import { timeDiff, interval, expires } from '@vielzeug/toolkit';

// Human-readable time difference
timeDiff(new Date('2025-01-01'), new Date());
// e.g. { value: 2, unit: 'MONTH' }

// Generate date range
interval('2024-01-01', '2024-01-07', { interval: 'day' });
// [Date, Date, Date, Date, Date, Date, Date]

// Check expiration
expires('2023-01-01'); // e.g. 'EXPIRED'
```

### Type Guards

```typescript
import { is } from '@vielzeug/toolkit';

is.string(v);
is.number(v);
is.boolean(v);
is.array(v);
is.object(v);
is.fn(v);
is.date(v);
is.promise(v);
is.regex(v);
is.nil(v);
is.defined(v);
is.primitive(v);
is.empty(v);
is.equal(a, b);
is.match(obj, src);
is.even(n);
is.odd(n);
is.positive(n);
is.negative(n);
is.zero(n);
is.within(n, min, max);
is.ge(a, b);
is.gt(a, b);
is.le(a, b);
is.lt(a, b);
is.typeOf(v); // e.g. 'string' | 'number' | 'array'
```

## API

### Array

| Function | Description |
|---|---|
| `chunk(arr, size)` | Split array into chunks of given size |
| `contains(arr, value)` | Check if array contains a value (deep equality) |
| `fold(arr, fn)` | Reduce without initial value |
| `group(arr, selector)` | Group by key — returns `Record<string, T[]>` |
| `keyBy(arr, selector)` | Index by key — returns `Record<string, T>` |
| `list(data, opts?)` | Reactive client-side pagination |
| `pick(arr, valueFn, predicate?)` | Pick single transformed element |
| `remoteList(opts)` | Reactive server-side pagination |
| `replace(arr, predicate, value)` | Replace first matching element |
| `rotate(arr, n, opts?)` | Rotate elements by N positions |
| `search(arr, query, opts?)` | Fuzzy search |
| `select(arr, mapper, predicate?)` | Map elements matching predicate (default: not nil) |
| `sort(arr, selector, direction?)` | Sort by selector with `'asc'`/`'desc'` direction |
| `sort(arr, selectors)` | Sort by multiple fields using object selectors |
| `toggle(arr, item, selector?, opts?)` | Add or remove item |
| `uniq(arr)` | Remove duplicates |

### Object

| Function | Description |
|---|---|
| `cache()` | Key-value cache with auto GC |
| `diff(a, b)` | Find differences between objects |
| `merge(strategy, ...objs)` | Merge objects (deep/shallow/concat) |
| `parseJSON(str, fallback?)` | Safe JSON parse |
| `get(obj, path, default?)` | Access nested property by dot-path |
| `proxy(obj, opts)` | Object proxy with get/set hooks |
| `prune(value)` | Remove nulls/empty values recursively |
| `seek(obj, query, tone?)` | Search object values by similarity score |

### String

| Function | Description |
|---|---|
| `camelCase(str)` | Convert to camelCase |
| `kebabCase(str)` | Convert to kebab-case |
| `pascalCase(str)` | Convert to PascalCase |
| `similarity(a, b)` | Similarity score (0–1) between two strings |
| `snakeCase(str)` | Convert to snake_case |
| `truncate(str, limit)` | Truncate with ellipsis |

### Function

| Function | Description |
|---|---|
| `assert(cond, msg, opts?)` | Assert condition, throw on failure |
| `assertParams(params, keys)` | Validate required object keys |
| `compare(a, b)` | Safe comparator returning -1 \| 0 \| 1 |
| `compareBy(criteria)` | Multi-key object comparator |
| `compose(...fns)` | Right-to-left function composition |
| `curry(fn)` | Curry with partial application |
| `debounce(fn, ms)` | Delay execution until idle |
| `fp(fn, ...args)` | Functional pipeline helper |
| `memo(fn)` | Cache results by arguments |
| `once(fn)` | Execute only on first call |
| `pipe(...fns)` | Left-to-right function composition |
| `throttle(fn, ms)` | Limit execution rate |

### Async

| Function | Description |
|---|---|
| `attempt(fn, opts?)` | Execute with retry and error handling |
| `defer()` | Deferred promise with external resolve/reject |
| `parallel(n, items, fn, signal?)` | Process array with concurrency limit |
| `pool(n)` | Concurrency-limited promise pool |
| `queue(opts?)` | Sequential/concurrent task queue |
| `race(promise, minDelay)` | Race promise against minimum delay |
| `retry(fn, opts?)` | Retry with backoff |
| `sleep(ms)` | Async delay |
| `waitFor(cond, opts?)` | Poll until condition is true |

### Math

| Function | Description |
|---|---|
| `abs(n)` | Absolute value |
| `allocate(amount, ratios)` | Distribute proportionally (bigint) |
| `average(arr, fn?)` | Average of numbers |
| `clamp(n, min, max)` | Clamp to range |
| `distribute(amount, n)` | Distribute evenly (bigint) |
| `linspace(start, end, steps?)` | Evenly spaced number array |
| `max(arr, fn?)` | Maximum value |
| `median(arr, fn?)` | Median value |
| `min(arr, fn?)` | Minimum value |
| `percent(value, total)` | Percentage (0–100) |
| `range(start, end, step?)` | Generate number array |
| `round(n, precision?)` | Round to decimal places |
| `sum(arr, fn?)` | Sum of numbers |

### Date

| Function | Description |
|---|---|
| `expires(date)` | Check expiration status |
| `interval(start, end, opts?)` | Generate date array for a range |
| `timeDiff(a, b?, units?)` | Time difference as `{ value, unit }` |

### Money

| Function | Description |
|---|---|
| `currency(money)` | Format for display |
| `exchange(money, opts)` | Convert between currencies |

### Random

| Function | Description |
|---|---|
| `draw(arr)` | Random element from array |
| `random(min, max)` | Random number in range |
| `shuffle(arr)` | Shuffle array |
| `uuid()` | Generate UUID v4 |

### Type Guards (`is` namespace)

All type checks live on the `is` object:

```typescript
import { is } from '@vielzeug/toolkit';

is.string(v);
is.number(v);
is.boolean(v);
is.array(v);
is.object(v);
is.fn(v);
is.date(v);
is.promise(v);
is.regex(v);
is.nil(v);
is.defined(v);
is.primitive(v);
is.empty(v);
is.equal(a, b);
is.match(obj, src);
is.even(n);
is.odd(n);
is.positive(n);
is.negative(n);
is.zero(n);
is.within(n, min, max);
is.ge(a, b);
is.gt(a, b);
is.le(a, b);
is.lt(a, b);
is.typeOf(v); // e.g. 'string' | 'number' | 'array'
```

## Documentation

Full docs at **[vielzeug.dev/toolkit](https://vielzeug.dev/toolkit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/toolkit/usage) | Arrays, objects, async, strings |
| [API Reference](https://vielzeug.dev/toolkit/api) | Complete function signatures |
| [Examples](https://vielzeug.dev/toolkit/examples) | Real-world utility patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
