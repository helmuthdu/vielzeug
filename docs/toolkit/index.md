---
title: Toolkit — Utility library for TypeScript
description: Comprehensive, tree-shakeable utility library with zero dependencies. Helpers for arrays, objects, strings, async, dates, math, and more.
---

<PackageBadges package="toolkit" />

<img src="/logo-toolkit.svg" alt="Toolkit Logo" width="156" class="logo-highlight"/>

# Toolkit

**Toolkit** is a comprehensive, tree-shakeable utility library with zero dependencies. Covers arrays, objects, strings, async, dates, math, and random — all fully typed.

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
import { chunk, group, keyBy, select, toggle, debounce, retry, merge, is } from '@vielzeug/toolkit';

// Arrays
chunk([1, 2, 3, 4, 5], 2); // [[1,2],[3,4],[5]]
group([{ type: 'a' }, { type: 'b' }, { type: 'a' }], (x) => x.type);
// { a: [...], b: [...] }
keyBy(
  [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ],
  'id',
);
// { '1': {id:1,name:'Alice'}, '2': {id:2,name:'Bob'} }

// Functions
const fn = debounce(() => console.log('typed'), 300);

// Async
const result = await retry(() => fetchData(), { times: 3, delay: 1000 });

// Objects
const merged = merge('deep', { a: { x: 1 } }, { a: { y: 2 } });
// { a: { x: 1, y: 2 } }

// Type guards
is.string('hello'); // true
is.nil(null); // true
```

## Features

- **Arrays** — `chunk`, `group`, `keyBy`, `fold`, `select`, `toggle`, `replace`, `rotate`, `search`, `sort`, `contains`, `uniq`, `pick`, `list`, `remoteList`
- **Async** — `retry`, `sleep`, `parallel`, `pool`, `queue`, `race`, `attempt`, `defer`, `waitFor`
- **Objects** — `merge`, `diff`, `get`, `seek`, `prune`, `proxy`, `cache`, `parseJSON`
- **Strings** — `camelCase`, `kebabCase`, `pascalCase`, `snakeCase`, `truncate`, `similarity`
- **Math** — `sum`, `average`, `median`, `min`, `max`, `clamp`, `round`, `range`, `percent`, `linspace`, `allocate`, `distribute`
- **Dates** — `timeDiff`, `interval`, `expires`
- **Functions** — `debounce`, `throttle`, `compose`, `pipe`, `curry`, `memo`, `once`, `compare`, `fp`
- **Zero dependencies** — tree-shakeable; import only what you need

## Next Steps

|                                 |                                          |
| ------------------------------- | ---------------------------------------- |
| [Usage Guide](./usage.md)       | Category overview with common patterns   |
| [API Reference](./api.md)       | Complete function signatures by category |
| [Examples](./examples/array.md) | Real-world utility recipes               |
