---
title: Arsenal — Utility library for TypeScript
description: Tree-shakeable, zero-dependency utility library for arrays, async control flow, objects, strings, functions, math, and typed checks.
package: arsenal
category: utilities
keywords: [utility, array, string, object, math, async, debounce, throttle, functional, helpers]
exports:
  [
    chunk,
    debounce,
    throttle,
    allOf,
    clamp,
    isEqual,
    attempt,
    retry,
    sleep,
    hash,
    fuzzy,
    getPath,
    deepMerge,
    diff,
    stash,
    memo,
  ]
related: [tempo, sourcerer, spell, coins]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="arsenal" />

## Why Arsenal?

Arsenal favors a curated, typed utility surface over an everything-and-the-kitchen-sink API, with zero dependencies and modern tree-shakeable exports.

| Feature                     | Arsenal                                       | lodash-es                                  | Remeda                                     |
| --------------------------- | --------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Bundle size                 | <PackageInfo package="arsenal" type="size" /> | ~72 kB                                     | ~18 kB                                     |
| TypeScript-first ergonomics | <sg-icon name="check" size="16"></sg-icon>    | Partial                                    | <sg-icon name="check" size="16"></sg-icon> |
| Deep utility coverage       | <sg-icon name="check" size="16"></sg-icon>    | <sg-icon name="check" size="16"></sg-icon> | Partial                                    |
| Async control-flow helpers  | <sg-icon name="check" size="16"></sg-icon>    | Partial                                    | <sg-icon name="x" size="16"></sg-icon>     |
| Typed predicate functions   | <sg-icon name="check" size="16"></sg-icon>    | <sg-icon name="x" size="16"></sg-icon>     | Partial                                    |
| Tree-shakeable modules      | <sg-icon name="check" size="16"></sg-icon>    | <sg-icon name="check" size="16"></sg-icon> | <sg-icon name="check" size="16"></sg-icon> |
| Zero dependencies           | <sg-icon name="check" size="16"></sg-icon>    | <sg-icon name="check" size="16"></sg-icon> | <sg-icon name="check" size="16"></sg-icon> |

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
import { chunk, deepMerge, diff, fuzzy, hash, parseJSON, pick, queue, retry } from '@vielzeug/arsenal';

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
  fallback: { api: { host: 'localhost', port: 3000 } },
});

// Fuzzy search — filter mode returns T[], scored mode returns ScoredResult<T>[]
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];
const hits = fuzzy(users, 'alice'); // User[]
const ranked = fuzzy(users, 'alice', { scored: true }); // ScoredResult<User>[]
// [{ item: { name: 'Alice', ... }, score: 0.91 }, ...]

// Deep merge with optional array concatenation
deepMerge({ a: { x: 1 } }, { a: { y: 2 } }); // { a: { x: 1, y: 2 } }
deepMerge({ tags: ['a'] }, { tags: ['b'] }, { arrayStrategy: 'concat' }); // { tags: ['a','b'] }

// Structured diff
diff({ port: 3000 }, { port: 4000 });
// { added: [], removed: [], changed: { port: { before: 3000, after: 4000 } } }

// Deterministic cache keys from any value
const key = hash({ sort: 'asc', filter: { role: 'admin' } });
```

## Features

<div class="features-grid">

- **Array**: `chunk`, `compact`, `countBy`, `difference`, `filterMap`, `flatten`, `groupBy`, `indexBy`, `partition`, `fuzzy`, `fuzzyFilter`, `fuzzyScore`, `take/drop`, `union/intersection`, `zip/unzip`, and more
- **Async**: `abortError`, `attempt`, `parallel`, `queue`, `retry`, `sleep`, `waitFor`
- **Cache**: `memo` (sync LRU memoization), `stash` (TTL cache with stampede prevention)
- **Object**: `pick`, `omit`, `mapValues`, `mapKeys`, `filterValues`, `defaults`, `deepMerge`, `shallowMerge`, `diff`, `diffArrays`, `invert`, `prune`, `getPath`, `flattenPaths`, `unflattenPaths`, `parseJSON`, `hash` (deterministic, handles `Date`/`Set`/`Map`/`bigint`)
- **Function**: `pipe`, `assert`, `runAll`, `debounce`, `throttle`, `tap`, `identity`, `constant`, `once`, `memo`
- **Guards**: `allOf`, `anyOf`, `noneOf`, `isArray`, `isBoolean`, `isDate`, `isDefined`, `isEmpty`, `isEqual`, `isError`, `isFunction`, `isMatch`, `isNil`, `isNumber`, `isPlainObject`, `isPrimitive`, `isPromise`, `isRegex`, `isString`, `isAbortError`, `shallowEqual`
- **Math**: `lerp`, `normalize`, `mod`, `gcd/lcm`, `variance`, `standardDeviation`, `backoff`, plus numeric helpers
- **Random**: `draw`, `random`, `shuffle`, `uuid`

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
