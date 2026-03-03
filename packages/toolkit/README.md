# @vielzeug/toolkit

> Typed utility functions for everyday TypeScript — arrays, objects, strings, async, and more

[![npm version](https://img.shields.io/npm/v/@vielzeug/toolkit)](https://www.npmjs.com/package/@vielzeug/toolkit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Toolkit** is a tree-shakeable collection of TypeScript utility functions: group arrays, deep-clone objects, debounce/throttle, generate IDs, and more — all individually importable with full type inference.

## Installation

```sh
pnpm add @vielzeug/toolkit
# npm install @vielzeug/toolkit
# yarn add @vielzeug/toolkit
```

## Quick Start

```typescript
import { group, debounce, deepClone, uid, chunk } from '@vielzeug/toolkit';

// Group an array by a key
const byStatus = group(users, (u) => u.status);
// { active: [...], inactive: [...] }

// Debounce an event handler
const handleSearch = debounce((query: string) => fetchResults(query), 300);

// Deep clone a value
const copy = deepClone(complexObject);

// Unique ID
const id = uid(); // e.g. "k3f92x"

// Split array into pages
const pages = chunk([1, 2, 3, 4, 5], 2); // [[1,2],[3,4],[5]]
```

## Features

- ✅ **Tree-shakeable** — import only what you use
- ✅ **Type-safe** — full TypeScript inference on every utility
- ✅ **Array utils** — `chunk`, `group`, `uniq`, `uniqBy`, `flatten`, `compact`, `zip`, `sortBy`, `shuffle`
- ✅ **Object utils** — `deepClone`, `deepMerge`, `pick`, `omit`, `mapValues`, `mapKeys`
- ✅ **String utils** — `capitalize`, `camelCase`, `kebabCase`, `snakeCase`, `truncate`, `slugify`
- ✅ **Async utils** — `debounce`, `throttle`, `sleep`, `retry`, `timeout`
- ✅ **Function utils** — `memoize`, `once`, `pipe`, `compose`
- ✅ **ID / random** — `uid`, `randomInt`, `randomItem`, `sample`
- ✅ **Type guards** — `isNil`, `isObject`, `isArray`, `isString`, `isNumber`, `isFunction`
- ✅ **Zero dependencies**

## Usage

### Array Utilities

```typescript
import { group, chunk, uniq, uniqBy, sortBy, compact, flatten } from '@vielzeug/toolkit';

const grouped  = group(items, (i) => i.category);       // Record<string, Item[]>
const pages    = chunk(items, 10);                      // Item[][]
const unique   = uniq([1, 2, 2, 3]);                    // [1, 2, 3]
const uniqueBy = uniqBy(items, (i) => i.id);
const sorted   = sortBy(items, (i) => i.name);
const truthy   = compact([0, '', null, 1, 'a']);        // [1, 'a']
const flat     = flatten([[1, 2], [3, 4]]);             // [1, 2, 3, 4]
```

### Object Utilities

```typescript
import { deepClone, deepMerge, pick, omit, mapValues } from '@vielzeug/toolkit';

const clone   = deepClone({ nested: { arr: [1, 2, 3] } });
const merged  = deepMerge({ a: 1 }, { b: 2 });          // { a: 1, b: 2 }
const picked  = pick(user, ['name', 'email']);
const omitted = omit(user, ['password', 'salt']);
const mapped  = mapValues(record, (v) => v.toUpperCase());
```

### Async Utilities

```typescript
import { debounce, throttle, sleep, retry } from '@vielzeug/toolkit';

const search   = debounce(fetchResults, 300);
const scroll   = throttle(updatePosition, 16);

await sleep(500);

const result = await retry(() => unstableRequest(), { times: 3, delay: 200 });
```

### String Utilities

```typescript
import { capitalize, camelCase, kebabCase, truncate, slugify } from '@vielzeug/toolkit';

capitalize('hello world');     // 'Hello world'
camelCase('hello-world');      // 'helloWorld'
kebabCase('helloWorld');       // 'hello-world'
truncate('long text...', 10);  // 'long te...'
slugify('Hello World!');       // 'hello-world'
```

### Function Utilities

```typescript
import { memoize, once, pipe } from '@vielzeug/toolkit';

const expensive = memoize((n: number) => fib(n));
const init      = once(() => bootstrap());
const process   = pipe(trim, normalize, validate);
```

## API

### Array

| Function | Description |
|---|---|
| `chunk(arr, size)` | Split array into chunks of given size |
| `compact(arr)` | Remove falsy values |
| `flatten(arr)` | Shallow flatten nested arrays |
| `group(arr, selector)` | Group by key selector — returns `Record<string, T[]>` |
| `shuffle(arr)` | Return a randomly reordered copy |
| `sortBy(arr, selector)` | Sort by selector value |
| `uniq(arr)` | Remove duplicates |
| `uniqBy(arr, selector)` | Remove duplicates by selector |
| `zip(a, b)` | Zip two arrays into pairs |

### Object

| Function | Description |
|---|---|
| `deepClone(obj)` | Deep-clone a value |
| `deepMerge(target, ...sources)` | Recursively merge objects |
| `mapKeys(obj, fn)` | Transform object keys |
| `mapValues(obj, fn)` | Transform object values |
| `omit(obj, keys)` | Object without specified keys |
| `pick(obj, keys)` | Object with only specified keys |

### String

| Function | Description |
|---|---|
| `camelCase(str)` | Convert to camelCase |
| `capitalize(str)` | Capitalise first letter |
| `kebabCase(str)` | Convert to kebab-case |
| `slugify(str)` | URL-safe lowercase slug |
| `snakeCase(str)` | Convert to snake_case |
| `truncate(str, len, suffix?)` | Truncate with optional suffix |

### Async / Function

| Function | Description |
|---|---|
| `debounce(fn, ms)` | Debounce function calls |
| `memoize(fn)` | Cache results by arguments |
| `once(fn)` | Execute only on first call |
| `pipe(...fns)` | Left-to-right function composition |
| `retry(fn, opts)` | Retry a failing async function |
| `sleep(ms)` | Async delay |
| `throttle(fn, ms)` | Throttle function calls |

## Documentation

Full docs at **[vielzeug.dev/toolkit](https://vielzeug.dev/toolkit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/toolkit/usage) | Arrays, objects, async, strings |
| [API Reference](https://vielzeug.dev/toolkit/api) | Complete function signatures |
| [Examples](https://vielzeug.dev/toolkit/examples) | Real-world utility patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
