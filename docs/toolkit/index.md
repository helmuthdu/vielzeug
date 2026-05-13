---
title: Toolkit — Utility library for TypeScript
description: Tree-shakeable, zero-dependency utility library for arrays, async control flow, objects, strings, functions, math, dates, money, random, and typed checks.
---

<PackageBadges package="toolkit" />

<img src="/logo-toolkit.svg" alt="Toolkit logo" width="156" class="logo-highlight"/>

`@vielzeug/toolkit` is a compact utility package built for modern TypeScript projects. The API is intentionally small, composable, and fully tree-shakeable.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/toolkit
```

```sh [npm]
npm install @vielzeug/toolkit
```

```sh [yarn]
yarn add @vielzeug/toolkit
```

:::

## Quick Start

```ts
import {
  chunk,
  pick,
  queue,
  retry,
  deepMerge,
  partial,
  filterMap,
  is,
} from '@vielzeug/toolkit';

const pages = chunk([1, 2, 3, 4, 5], 2);
const user = pick({ id: 1, name: 'Alice', role: 'admin' }, ['id', 'name']);

const q = queue({ concurrency: 2 });
await q.add(() => fetch('/api/a'));

const health = await retry(() => fetch('/api/health').then((r) => r.json()), {
  times: 3,
  delay: 250,
});

const cfg = deepMerge({ api: { host: 'localhost' } }, { api: { port: 3000 } });

const doubleAll = partial((factor: number, values: number[]) => values.map((n) => n * factor), 2);
const doubled = doubleAll([1, 2, 3]);

if (is.object(cfg)) {
  console.log(health, cfg, user);
}
```

## Feature Areas

- **Array**: `chunk`, `compact`, `countBy`, `difference`, `filterMap`, `flatten`, `groupBy`, `indexBy`, `partition`, `sample`, `take/drop`, `union/intersection`, `zip/unzip`, and more
- **Async**: `attempt`, `predict`, `abortable`, `timeout`, `parallel`, `queue`, `Scheduler`, `retry`, `waitFor`
- **Object**: `pick`, `omit`, `mapValues`, `mapKeys`, `filterValues`, `entries`, `fromEntries`, `keys`, `values`, `deepClone`, `deepMerge`, `shallowMerge`, `defaults`, plus core APIs
- **Function**: `partial`, `negate`, `and/or/not`, `tap`, `identity`, `constant`, composition, memoization, and rate limiting
- **Math**: `lerp`, `normalize`, `mod`, `gcd/lcm`, `variance`, `standardDeviation`, plus existing numeric helpers
- **Date**: `expires`, `interval`, `timeDiff`
- **Money**: `currency`, `exchange`
- **Random**: `draw`, `random`, `shuffle`, `uuid`
- **Typed Namespace**: `is.array`, `is.boolean`, `is.date`, `is.defined`, `is.empty`, `is.equal`, `is.fn`, `is.greaterThan`, `is.greaterThanOrEqual`, `is.lessThan`, `is.lessThanOrEqual`, `is.match`, `is.nil`, `is.number`, `is.object`, `is.primitive`, `is.promise`, `is.regex`, `is.string`, `is.typeOf`, `is.within`
- **Typed Predicates**: standalone numeric helpers `isGreaterThan`, `isGreaterThanOrEqual`, `isLessThan`, `isLessThanOrEqual`, `isWithin`

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation Map

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Fetchit](/fetchit/)
- [Stateit](/stateit/)
- [Validit](/validit/)
