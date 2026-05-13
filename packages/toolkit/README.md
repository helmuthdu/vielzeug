# @vielzeug/toolkit

> Typed, zero-dependency utility library for modern TypeScript.

[![npm version](https://img.shields.io/npm/v/@vielzeug/toolkit)](https://www.npmjs.com/package/@vielzeug/toolkit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/toolkit` provides a focused set of tree-shakeable utilities for arrays, async workflows, objects, strings, functions, math, dates, money, random values, and runtime type checks.

## Installation

```sh
pnpm add @vielzeug/toolkit
# npm install @vielzeug/toolkit
# yarn add @vielzeug/toolkit
```

## Quick Start

```ts
import {
  chunk,
  pick,
  groupBy,
  queue,
  retry,
  deepMerge,
  partial,
  filterMap,
  currency,
  is,
} from '@vielzeug/toolkit';

const pages = chunk([1, 2, 3, 4, 5], 2);
const byRole = groupBy(users, (u) => u.role);
const safe = pick({ id: 1, name: 'Alice', role: 'admin' }, ['id', 'name']);

const q = queue({ concurrency: 2 });
await q.add(() => fetch('/api/a'));

const data = await retry(() => fetch('/api/health').then((r) => r.json()), {
  times: 3,
  delay: 200,
});

const cfg = deepMerge({ api: { host: 'localhost' } }, { api: { port: 3000 } });

const doubleAll = partial((factor: number, values: number[]) => values.map((n) => n * factor), 2);
const doubled = filterMap(doubleAll([1, 2, 3]), (n) => (n > 2 ? n : undefined));

const price = currency({ amount: 123456n, currency: 'USD' }); // $1,234.56

if (is.string(price)) {
  console.log(price.toUpperCase(), safe);
}
```

## Exports

### Array

`chunk`, `compact`, `contains`, `countBy`, `difference`, `drop`, `dropLast`, `filterMap`, `first`, `flatten`, `groupBy`, `indexBy`, `intersection`, `last`, `partition`, `replace`, `rotate`, `sample`, `search`, `sort`, `take`, `takeLast`, `toggle`, `union`, `uniq`, `unzip`, `zip`

### Async

`abortable`, `attempt`, `defer`, `parallel`, `predict`, `Scheduler`, `polyfillScheduler`, `queue`, `retry`, `sleep`, `timeout`, `waitFor`

### Date

`expires`, `interval`, `timeDiff`

### Function

`assert`, `compare`, `compareBy`, `compose`, `constant`, `curry`, `debounce`, `identity`, `memo`, `negate`, `once`, `partial`, `pipe`, `and`, `or`, `not`, `tap`, `throttle`

### Math

`abs`, `allocate`, `average`, `clamp`, `gcd`, `lcm`, `lerp`, `linspace`, `max`, `median`, `min`, `mod`, `normalize`, `percent`, `range`, `round`, `standardDeviation`, `sum`, `variance`

### Money

`currency`, `exchange`, `Money`

### Object

`stash`, `deepClone`, `defaults`, `diff`, `entries`, `filterValues`, `fromEntries`, `get` (from `path.ts`), `has`, `invert`, `keys`, `mapKeys`, `mapValues`, `deepMerge`, `shallowMerge`, `omit`, `parseJSON`, `pick`, `prune`, `seek`, `values`

### Random

`draw`, `random`, `shuffle`, `uuid`

### String

`camelCase`, `endsWith`, `escape`, `kebabCase`, `pad`, `pascalCase`, `similarity`, `snakeCase`, `startsWith`, `titleCase`, `truncate`, `unescape`, `words`

### Typed

`isGreaterThan`, `isGreaterThanOrEqual`, `isLessThan`, `isLessThanOrEqual`, `isWithin`

### Typed Namespace

`is.array`, `is.boolean`, `is.date`, `is.defined`, `is.empty`, `is.equal`, `is.fn`, `is.match`, `is.nil`, `is.number`, `is.object`, `is.primitive`, `is.promise`, `is.regex`, `is.string`, `is.typeOf`

## Features

- Tree-shakeable ESM-first package
- Zero runtime dependencies
- Typed APIs with good inference
- Browser + Node compatible
- Small composable primitives instead of monolithic helpers

## Documentation

- [Overview](https://vielzeug.dev/toolkit/)
- [Usage Guide](https://vielzeug.dev/toolkit/usage)
- [API Reference](https://vielzeug.dev/toolkit/api)
- [Examples](https://vielzeug.dev/toolkit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
