---
title: Toolkit — Utility library for TypeScript
description: Tree-shakeable, zero-dependency utility library for arrays, objects, strings, async flows, dates, and math.
---

<PackageBadges package="toolkit" />

<img src="/logo-toolkit.svg" alt="Toolkit logo" width="156" class="logo-highlight"/>

# Toolkit

**Toolkit** is a comprehensive utility library with zero dependencies. It is tree-shakeable, so you only bundle what you import. It ships 75+ fully typed utilities for arrays, objects, strings, async flows, dates, math, money, random values, and runtime type checks.

<!-- Search keywords: utility library, helper functions, TypeScript utilities. -->

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
import { chunk, group, keyBy, select, toggle, sort, debounce, retry, merge, is } from '@vielzeug/toolkit';

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

// Sort with object selectors
sort(
  [
    { age: 30, name: 'Bob' },
    { age: 30, name: 'Alice' },
    { age: 25, name: 'Chris' },
  ],
  { age: 'desc', name: 'asc' },
);

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

## Why Toolkit?

Lodash ships ~70 kB even tree-shaken. Toolkit provides modern, tree-shakeable utilities with full TypeScript inference at a fraction of the size.

```ts
// Before - verbose native JS
let groupedByCategory = {} as Record<string, typeof items>;

groupedByCategory = items.reduce((acc, item) => {
  const key = item.category;
  (acc[key] = acc[key] || []).push(item);

  return acc;
}, groupedByCategory);

// After - Toolkit
import { group } from '@vielzeug/toolkit';
const grouped = group(items, (item) => item.category);
```

| Feature           | Toolkit                                       | Lodash        | Radash |
| ----------------- | --------------------------------------------- | ------------- | ------ |
| Bundle size       | <PackageInfo package="toolkit" type="size" /> | ~26 kB        | ~5 kB  |
| Tree-shakeable    | ✅ Always                                     | ✅ lodash-es  | ✅     |
| TypeScript        | ✅ First-class                                | ⚠️ Via @types | ✅     |
| Async utilities   | ✅                                            | ⚠️ Limited    | ✅     |
| Zero dependencies | ✅                                            | ✅            | ✅     |

**Use Toolkit when** you want utility functions with strong TypeScript types and minimal bundle impact.

**Consider Lodash or Radash** if your codebase already depends on them and migration effort outweighs the type and bundle-size gains.

## Features

- **Arrays** — `chunk`, `group`, `keyBy`, `fold`, `select`, `toggle`, `replace`, `rotate`, `search`, `sort`, `contains`, `uniq`, `pick`, `list`, `remoteList`
- **Async** — `retry`, `sleep`, `parallel`, `pool`, `queue`, `race`, `attempt`, `defer`, `waitFor`
- **Objects** — `merge`, `diff`, `get`, `seek`, `prune`, `proxy`, `cache`, `parseJSON`
- **Strings** — `camelCase`, `kebabCase`, `pascalCase`, `snakeCase`, `truncate`, `similarity`
- **Math** — `sum`, `average`, `median`, `min`, `max`, `clamp`, `round`, `range`, `percent`, `linspace`, `allocate`, `distribute`
- **Dates** — `timeDiff`, `interval`, `expires`
- **Functions** — `debounce`, `throttle`, `compose`, `pipe`, `curry`, `memo`, `once`, `compare`, `fp`
- **Zero dependencies** — tree-shakeable; import only what you need

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## See Also

- [Fetchit](/fetchit/)
- [Stateit](/stateit/)
- [Validit](/validit/)
