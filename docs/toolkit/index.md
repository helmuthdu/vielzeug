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
import { chunk, group, debounce, retry, merge } from '@vielzeug/toolkit';

// Arrays
chunk([1, 2, 3, 4, 5], 2);           // [[1,2],[3,4],[5]]
group([{type:'a'},{type:'b'},{type:'a'}], x => x.type);
// { a: [...], b: [...] }

// Functions
const fn = debounce(() => console.log('typed'), 300);

// Async
const result = await retry(() => fetchData(), { times: 3, delay: 1000 });

// Objects
const merged = merge('deep', { a: { x: 1 } }, { a: { y: 2 } });
// { a: { x: 1, y: 2 } }
```

## Features

- **Arrays** — `chunk`, `group`, `flatten`, `uniq`, `sort`, `search`, `compact`, and more
- **Async** — `retry`, `sleep`, `delay`, `parallel`, `pool`, `queue`, `race`, `waitFor`
- **Objects** — `merge`, `clone`, `diff`, `path`, `seek`, `cache`, `parseJSON`, and more
- **Strings** — `camelCase`, `kebabCase`, `pascalCase`, `snakeCase`, `truncate`, `similarity`
- **Math** — `clamp`, `average`, `sum`, `round`, `range`, and more
- **Dates** — `timeDiff`, `interval`, `expires`
- **Functions** — `debounce`, `throttle`, `compose`, `pipe`, `curry`, `memo`, `once`
- **Zero dependencies** — tree-shakeable; import only what you need

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Category overview with common patterns |
| [API Reference](./api.md) | Complete function signatures by category |
| [Examples](./examples/array.md) | Real-world utility recipes |
