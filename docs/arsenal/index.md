---
title: Arsenal — Utility library for TypeScript
description: Tree-shakeable, zero-dependency utility library for arrays, async control flow, objects, strings, functions, math, dates, money, random, and typed checks.
package: arsenal
category: utilities
keywords: [utility, array, string, object, math, async, debounce, throttle, functional, helpers]
related: []
exports: [chunk, debounce, throttle, allOf, clamp, isEqual, currency, retry, sleep]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="arsenal" />

<img src="/logo-arsenal.svg" alt="Arsenal logo" width="156" class="logo-highlight"/>

# Arsenal

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/arsenal` &nbsp;·&nbsp; **Category:** Utilities

**Key exports:** `chunk`, `debounce`, `throttle`, `allOf`, `clamp`, `isEqual`, `currency`, `retry`, `sleep`

**When to use:** 75+ tree-shakeable utility functions for arrays, objects, strings, async control, math, and money. Import only what you use.

**Related:** [Tempo](/tempo/) · [Sourcerer](/sourcerer/) · [Spell](/spell/)

</details>

`@vielzeug/arsenal` is a compact utility package built for modern TypeScript projects. The API is intentionally small, composable, and fully tree-shakeable.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/arsenal
```

```sh [npm]
npm install @vielzeug/arsenal
```

```sh [yarn]
yarn add @vielzeug/arsenal
```

:::

## Quick Start

```ts
import { chunk, pick, queue, retry, parseJSON, partial, filterMap, is } from '@vielzeug/arsenal';

const pages = chunk([1, 2, 3, 4, 5], 2);
const user = pick({ id: 1, name: 'Alice', role: 'admin' }, ['id', 'name']);

const q = queue({ concurrency: 2 });
await q.add(() => fetch('/api/a'));

const health = await retry(() => fetch('/api/health').then((r) => r.json()), {
  times: 3,
  delay: 250,
});

const cfg = parseJSON('{"api":{"host":"localhost","port":3000}}', {
  defaultValue: { api: { host: 'localhost', port: 3000 } },
});

const doubleAll = partial((factor: number, values: number[]) => values.map((n) => n * factor), 2);
const doubled = doubleAll([1, 2, 3]);

if (is.object(cfg)) {
  console.log(health, cfg, user);
}
```

## Why Arsenal?

Arsenal favors a curated, typed utility surface over an everything-and-the-kitchen-sink API, with zero dependencies and modern tree-shakeable exports.

| Feature                     | Arsenal                                       | lodash-es | Remeda  |
| --------------------------- | --------------------------------------------- | --------- | ------- |
| Bundle size                 | <PackageInfo package="arsenal" type="size" /> | ~72 kB    | ~18 kB  |
| TypeScript-first ergonomics | ✅                                            | Partial   | ✅      |
| Deep utility coverage       | ✅                                            | ✅        | Partial |
| Async control-flow helpers  | ✅                                            | Partial   | ❌      |
| Typed predicate namespace   | ✅                                            | ❌        | Partial |
| Tree-shakeable modules      | ✅                                            | ✅        | ✅      |
| Zero dependencies           | ✅                                            | ✅        | ✅      |

**Use Arsenal when** you want one compact, typed utility layer that covers array/object/function/async/math/money/random use cases.

**Consider narrower alternatives when** you only need a small functional subset and prefer ultra-focused APIs.

## Features

- **Array**: `chunk`, `compact`, `countBy`, `difference`, `filterMap`, `flatten`, `groupBy`, `indexBy`, `partition`, `sample`, `take/drop`, `union/intersection`, `zip/unzip`, and more
- **Async**: `attempt`, `abortable`, `timeout`, `parallel`, `queue`, `Scheduler`, `retry`, `waitFor`
- **Object**: `pick`, `omit`, `mapValues`, `mapKeys`, `filterValues`, `entries`, `fromEntries`, `keys`, `values`, `deepClone`, `defaults`, `deepMerge`, `shallowMerge`, `parseJSON`, `get`, `stash`
- **Function**: `partial`, `allOf`, `anyOf`, `noneOf`, `tap`, `identity`, `constant`, composition, memoization, and rate limiting
- **Math**: `lerp`, `normalize`, `mod`, `gcd/lcm`, `variance`, `standardDeviation`, plus existing numeric helpers
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

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Tempo](/tempo/) — date/time utilities including `expires`, `timeDiff`, and `dateRange`
- [Sourcerer](/sourcerer/) — reactive paginated query sources built on top of arsenal primitives
- [Spell](/spell/) — schema validation that pairs naturally with `parseJSON` and `assert`

<!-- markdownlint-enable MD025 MD033 MD060 -->
