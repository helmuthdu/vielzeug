---
title: Arsenal — Utility library for TypeScript
description: Tree-shakeable, zero-dependency utility library for arrays, async control flow, objects, strings, functions, math, and typed checks.
package: arsenal
category: utilities
keywords: [utility, array, string, object, math, async, debounce, throttle, functional, helpers]
exports: [chunk, debounce, throttle, allOf, clamp, isEqual, attempt, retry, sleep, stableStringify, search, getPath]
related: [tempo, sourcerer, spell, coins]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="arsenal" />

## Why Arsenal?

Arsenal favors a curated, typed utility surface over an everything-and-the-kitchen-sink API, with zero dependencies and modern tree-shakeable exports.

| Feature                     | Arsenal                                       | lodash-es | Remeda  |
| --------------------------- | --------------------------------------------- | --------- | ------- |
| Bundle size                 | <PackageInfo package="arsenal" type="size" /> | ~72 kB    | ~18 kB  |
| TypeScript-first ergonomics | <sg-icon name="check" size="16"></sg-icon>                                            | Partial   | <sg-icon name="check" size="16"></sg-icon>      |
| Deep utility coverage       | <sg-icon name="check" size="16"></sg-icon>                                            | <sg-icon name="check" size="16"></sg-icon>        | Partial |
| Async control-flow helpers  | <sg-icon name="check" size="16"></sg-icon>                                            | Partial   | <sg-icon name="x" size="16"></sg-icon>      |
| Typed predicate functions   | <sg-icon name="check" size="16"></sg-icon>                                            | <sg-icon name="x" size="16"></sg-icon>        | Partial |
| Tree-shakeable modules      | <sg-icon name="check" size="16"></sg-icon>                                            | <sg-icon name="check" size="16"></sg-icon>        | <sg-icon name="check" size="16"></sg-icon>      |
| Zero dependencies           | <sg-icon name="check" size="16"></sg-icon>                                            | <sg-icon name="check" size="16"></sg-icon>        | <sg-icon name="check" size="16"></sg-icon>      |

<div class="decision-callout">

**Use Arsenal when** you want one compact, typed utility layer that covers array/object/function/async/math use cases. For money handling, use [`@vielzeug/coins`](/coins/).

**Consider narrower alternatives when** you only need a small functional subset and prefer ultra-focused APIs.

</div>

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
import { chunk, pick, queue, retry, parseJSON, partial, filterMap, search, stableStringify } from '@vielzeug/arsenal';

const pages = chunk([1, 2, 3, 4, 5], 2);
const user = pick({ id: 1, name: 'Alice', role: 'admin' }, ['id', 'name']);

const q = queue({ concurrency: 2 });
await q.add(() => fetch('/api/a'));

const health = await retry(() => fetch('/api/health').then((r) => r.json()), {
  times: 3,
  delay: 250,
  timeout: 5000,
});

const cfg = parseJSON('{"api":{"host":"localhost","port":3000}}', {
  defaultValue: { api: { host: 'localhost', port: 3000 } },
});

const doubleAll = partial((factor: number, values: number[]) => values.map((n) => n * factor), 2);
const doubled = doubleAll([1, 2, 3]);

// Fuzzy search — filter mode (default) or scored mode
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];
const hits = search(users, 'alice', { mode: 'scored' });
// [{ item: { name: 'Alice', ... }, score: 0.91 }, ...]

// Deterministic cache keys from any value
const key = stableStringify({ sort: 'asc', filter: { role: 'admin' } });
```

## Features

<div class="features-grid">

- **Array**: `chunk`, `compact`, `countBy`, `difference`, `filterMap`, `flatten`, `groupBy`, `indexBy`, `partition`, `sample`, `search`, `take/drop`, `union/intersection`, `zip/unzip`, and more
- **Async**: `abortable`, `abortError`, `attempt`, `parallel`, `queue`, `retry`, `sleep`, `waitFor`
- **Object**: `pick`, `omit`, `mapValues`, `mapKeys`, `filterValues`, `entries`, `fromEntries`, `keys`, `values`, `defaults`, `deepMerge`, `deepMergeWith`, `shallowMerge`, `parseJSON`, `getPath`, `stash`, `stableStringify`, `flattenPaths`, `cache`, `getOrCreate`
- **Function**: `partial`, `allOf`, `anyOf`, `noneOf`, `tap`, `identity`, `constant`, `assert`, `runAll`, compose, memoization, and rate limiting
- **Math**: `lerp`, `normalize`, `mod`, `gcd/lcm`, `variance`, `standardDeviation`, `backoff`, plus numeric helpers
- **Random**: `draw`, `random`, `shuffle`, `uuid`
- **Typed predicates**: `isArray`, `isBoolean`, `isDate`, `isDefined`, `isEmpty`, `isEqual`, `isError`, `isFunction`, `isMatch`, `isNil`, `isNumber`, `isPlainObject`, `isPrimitive`, `isPromise`, `isRegex`, `isString`, `isAbortError`

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Tempo](/tempo/) — date/time utilities including `expires`, `timeDiff`, and `dateRange`
- [Coins](/coins/) — money formatting and currency conversion (`currency`, `exchange`)
- [Sourcerer](/sourcerer/) — reactive paginated sources built on top of arsenal primitives
- [Spell](/spell/) — schema validation that pairs naturally with `parseJSON` and `assert`

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
