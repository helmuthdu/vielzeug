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
  group,
  queue,
  retry,
  merge,
  configure,
  select,
  currency,
  is,
} from '@vielzeug/toolkit';

const pages = chunk([1, 2, 3, 4, 5], 2);
const byRole = group(users, (u) => u.role);
const safe = pick({ id: 1, name: 'Alice', role: 'admin' }, ['id', 'name']);

const q = queue({ concurrency: 2 });
await q.add(() => fetch('/api/a'));

const data = await retry(() => fetch('/api/health').then((r) => r.json()), {
  times: 3,
  delay: 200,
});

const cfg = merge('deep', { api: { host: 'localhost' } }, { api: { port: 3000 } });

const doubleAll = configure(select, (n: number) => n * 2);
const doubled = doubleAll([1, 2, 3]);

const price = currency({ amount: 123456n, currency: 'USD' }); // $1,234.56

if (is.string(price)) {
  console.log(price.toUpperCase(), safe);
}
```

## Exports

### Array

`chunk`, `compact`, `contains`, `countBy`, `difference`, `drop`, `dropLast`, `first`, `flatten`, `group`, `intersection`, `keyBy`, `last`, `list`, `partition`, `remoteList`, `replace`, `rotate`, `sampleSize`, `search`, `select`, `sort`, `take`, `takeLast`, `toggle`, `union`, `uniq`, `unzip`, `zip`

### Async

`abortable`, `attempt`, `batch`, `defer`, `memoizeAsync`, `parallel`, `Scheduler`, `polyfillScheduler`, `queue`, `race`, `retry`, `sleep`, `timeout`, `waitFor`

### Date

`expires`, `interval`, `timeDiff`

### Function

`assert`, `compare`, `compareBy`, `compose`, `configure`, `constant`, `curry`, `debounce`, `flip`, `identity`, `memo`, `negate`, `once`, `pipe`, `tap`, `throttle`

### Math

`abs`, `allocate`, `average`, `clamp`, `gcd`, `lcm`, `lerp`, `linspace`, `max`, `median`, `min`, `mod`, `normalize`, `percent`, `range`, `round`, `standardDeviation`, `sum`, `variance`

### Money

`currency`, `exchange`, `Money`

### Object

`stash`, `deepClone`, `defaults`, `diff`, `entries`, `filterValues`, `fromEntries`, `get` (from `path.ts`), `has`, `invert`, `keys`, `mapKeys`, `mapValues`, `merge`, `omit`, `parseJSON`, `pick`, `proxy`, `prune`, `seek`, `values`

### Random

`draw`, `random`, `shuffle`, `uuid`

### String

`camelCase`, `endsWith`, `escape`, `kebabCase`, `pad`, `pascalCase`, `similarity`, `snakeCase`, `startsWith`, `titleCase`, `truncate`, `unescape`, `words`

### Typed

`isEven`, `isGe`, `isGt`, `isLe`, `isLt`, `isNegative`, `isOdd`, `isPositive`, `isWithin`, `isZero`

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
