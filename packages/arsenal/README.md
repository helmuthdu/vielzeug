# @vielzeug/arsenal

> Tree-shakeable, zero-dependency utility library for arrays, async control flow, objects, strings, functions, math, random, and typed checks.

[![npm version](https://img.shields.io/npm/v/@vielzeug/arsenal)](https://www.npmjs.com/package/@vielzeug/arsenal) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/arsenal` &nbsp;·&nbsp; **Category:** Utilities

**Key exports:** `chunk`, `debounce`, `throttle`, `allOf`, `clamp`, `isEqual`, `retry`, `sleep`, `stringify`, `fuzzy`, `getPath`, `deepMerge`, `diff`, `stash`, `memo`

**When to use:** Tree-shakeable, zero-dependency utility library for arrays, async control flow, objects, strings, functions, math, random, and typed checks.

**Related:** [`@vielzeug/coins`](https://www.npmjs.com/package/@vielzeug/coins) · [`@vielzeug/tempo`](https://www.npmjs.com/package/@vielzeug/tempo)

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
  deepMerge,
  diff,
  filterMap,
  fuzzy,
  groupBy,
  noneOf,
  partial,
  pick,
  queue,
  retry,
  stringify,
} from '@vielzeug/arsenal';

const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
];
const pages = chunk([1, 2, 3, 4, 5], 2);
const byRole = groupBy(users, (u) => u.role);
const safe = pick(users[0], ['id', 'name']);

const q = queue({ concurrency: 2 });
await q.add(() => fetch('/api/a'));

const data = await retry(() => fetch('/api/health').then((r) => r.json()), {
  times: 3,
  delay: 200,
});

const doubleAll = partial((factor: number, values: number[]) => values.map((n) => n * factor), 2);
const doubled = filterMap(doubleAll([1, 2, 3]), (n) => (n > 2 ? n : undefined));

// Compose predicates — allOf / anyOf / noneOf
const isWorkingAge = allOf<number>(
  (age) => age >= 18,
  (age) => age < 65,
);
const evens = [1, 2, 3, 4].filter(noneOf((n: number) => n % 2 !== 0));

// Fuzzy search — filter mode or scored mode
const filtered = fuzzy(users, 'alice');                      // User[]
const ranked = fuzzy(users, 'alice', { scored: true });      // ScoredResult<User>[]
// [{ item: { name: 'Alice', ... }, score: 0.91 }, ...]

// Deep merge with optional array strategy
deepMerge({ a: { x: 1 } }, { a: { y: 2 } });                // { a: { x: 1, y: 2 } }
deepMerge({ tags: ['a'] }, { tags: ['b'] }, { arrayStrategy: 'concat' }); // { tags: ['a', 'b'] }

// Structured object diff
diff({ port: 3000, host: 'localhost' }, { port: 4000 });
// { added: [], removed: ['host'], changed: { port: { before: 3000, after: 4000 } } }

// Deterministic cache keys
const key = stringify({ sort: 'asc', filter: { role: 'admin' } });
```

> **Money utilities** (`currency`, `exchange`) have moved to [`@vielzeug/coins`](https://www.npmjs.com/package/@vielzeug/coins).
> **Date utilities** (`expires`, `timeDiff`, `dateRange`) are available in [`@vielzeug/tempo`](https://www.npmjs.com/package/@vielzeug/tempo).

## Documentation

- [Overview](https://vielzeug.dev/arsenal/)
- [Usage Guide](https://vielzeug.dev/arsenal/usage)
- [API Reference](https://vielzeug.dev/arsenal/api)
- [Examples](https://vielzeug.dev/arsenal/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
