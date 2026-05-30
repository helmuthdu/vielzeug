---
description: Tree-shakeable, zero-dependency utility library for arrays, async control flow, objects, strings, functions, math, money, random, and typed checks.
package: arsenal
category: utilities
keywords: [utility, array, string, object, math, async, debounce, throttle, functional, helpers]
related: []
exports: [chunk, debounce, throttle, allOf, clamp, isEqual, currency, retry, sleep]
---

# @vielzeug/arsenal

> Tree-shakeable, zero-dependency utility library for arrays, async control flow, objects, strings, functions, math, money, random, and typed checks.

[![npm version](https://img.shields.io/npm/v/@vielzeug/arsenal)](https://www.npmjs.com/package/@vielzeug/arsenal) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/arsenal` &nbsp;·&nbsp; **Category:** Utilities

**Key exports:** `chunk`, `debounce`, `throttle`, `allOf`, `clamp`, `isEqual`, `currency`, `retry`, `sleep`

**When to use:** Tree-shakeable, zero-dependency utility library for arrays, async control flow, objects, strings, functions, math, money, random, and typed checks.

**Related:** None

</details>

`@vielzeug/arsenal` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/arsenal
npm install @vielzeug/arsenal
yarn add @vielzeug/arsenal
```

## Quick Start

```ts
import {
  allOf,
  chunk,
  currency,
  filterMap,
  groupBy,
  is,
  noneOf,
  partial,
  pick,
  queue,
  retry,
} from '@vielzeug/arsenal';

const pages = chunk([1, 2, 3, 4, 5], 2);
const byRole = groupBy(users, (u) => u.role);
const safe = pick({ id: 1, name: 'Alice', role: 'admin' }, ['id', 'name']);

const q = queue({ concurrency: 2 });
await q.add(() => fetch('/api/a'));

const data = await retry(() => fetch('/api/health').then((r) => r.json()), {
  times: 3,
  delay: 200,
});

const doubleAll = partial((factor: number, values: number[]) => values.map((n) => n * factor), 2);
const doubled = filterMap(doubleAll([1, 2, 3]), (n) => (n > 2 ? n : undefined));

// Compose predicates — allOf/anyOf/noneOf replace the old and/or/not/negate API
const isWorkingAge = allOf<number>(
  (age) => age >= 18,
  (age) => age < 65,
);
const evens = [1, 2, 3, 4].filter(noneOf((n: number) => n % 2 !== 0));

const price = currency({ amount: 123456n, currency: 'USD' }); // $1,234.56

if (is.string(price)) {
  console.log(price.toUpperCase(), safe, evens, isWorkingAge(30, 0, [30]));
}
```

> **Date utilities** (`expires`, `timeDiff`, `dateRange`) are available in [`@vielzeug/tempo`](https://www.npmjs.com/package/@vielzeug/tempo).

## Documentation

- [Overview](https://vielzeug.dev/arsenal/)
- [Usage Guide](https://vielzeug.dev/arsenal/usage)
- [API Reference](https://vielzeug.dev/arsenal/api)
- [Examples](https://vielzeug.dev/arsenal/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
