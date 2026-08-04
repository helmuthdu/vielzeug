# @vielzeug/arsenal

> Tree-shakeable, zero-dependency TypeScript utilities with focused category entry points.

[![npm version](https://img.shields.io/npm/v/@vielzeug/arsenal)](https://www.npmjs.com/package/@vielzeug/arsenal) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```sh
pnpm add @vielzeug/arsenal
npm install @vielzeug/arsenal
yarn add @vielzeug/arsenal
```

## Quick Start

```ts
import { chunk, groupBy, retry } from '@vielzeug/arsenal';
import { fuzzyFilter } from '@vielzeug/arsenal/array';
import { taskPool } from '@vielzeug/arsenal/async';
import { cache } from '@vielzeug/arsenal/cache';
import { tryParseJson } from '@vielzeug/arsenal/object';

const parsed = tryParseJson('{"users":[{"name":"Alice"}]}');
const users = parsed.ok ? (parsed.value as { users: { name: string }[] }).users : [];
const matches = fuzzyFilter(users, 'ali', { select: (user) => user.name });

const pool = taskPool({ concurrency: 2 });
const data = await pool.run((signal) => retry(() => fetch('/api', { signal }).then((response) => response.json())));

const responses = cache<string, unknown>({ ttlMs: 60_000 });
const profile = await responses.getOrLoad('/profile', () => fetch('/profile').then((response) => response.json()));

console.log(chunk([1, 2, 3], 2), groupBy(matches, (user) => user.name), data, profile);
pool.dispose();
```

## Entry Points

- `@vielzeug/arsenal` — curated common utilities
- `@vielzeug/arsenal/array` — array transforms and fuzzy search
- `@vielzeug/arsenal/async` — cancellation, retry, task pools, timing
- `@vielzeug/arsenal/cache` — in-memory cache and memoization
- `@vielzeug/arsenal/function` — function composition and timing
- `@vielzeug/arsenal/guards` — type guards and predicates
- `@vielzeug/arsenal/math` — numeric and statistical helpers
- `@vielzeug/arsenal/object` — object transforms, paths, hash, JSON parsing result
- `@vielzeug/arsenal/random` — cryptographic random helpers
- `@vielzeug/arsenal/string` — text transforms and similarity

## Documentation

- [Overview](https://vielzeug.dev/arsenal/)
- [Usage Guide](https://vielzeug.dev/arsenal/usage)
- [API Reference](https://vielzeug.dev/arsenal/api)
- [Examples](https://vielzeug.dev/arsenal/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
