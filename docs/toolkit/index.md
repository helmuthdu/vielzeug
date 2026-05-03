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
  queue,
  retry,
  merge,
  configure,
  select,
  is,
} from '@vielzeug/toolkit';

const pages = chunk([1, 2, 3, 4, 5], 2);

const q = queue({ concurrency: 2 });
await q.add(() => fetch('/api/a'));

const health = await retry(() => fetch('/api/health').then((r) => r.json()), {
  times: 3,
  delay: 250,
});

const cfg = merge('deep', { api: { host: 'localhost' } }, { api: { port: 3000 } });

const doubleAll = configure(select, (n: number) => n * 2);
const doubled = doubleAll([1, 2, 3]);

if (is.object(cfg)) {
  console.log(health, cfg);
}
```

## Feature Areas

- **Array**: `chunk`, `contains`, `group`, `keyBy`, `list`, `pick`, `remoteList`, `replace`, `rotate`, `search`, `select`, `sort`, `toggle`, `uniq`
- **Async**: `attempt`, `defer`, `parallel`, `Scheduler`, `polyfillScheduler`, `queue`, `race`, `retry`, `sleep`, `waitFor`
- **Object**: `stash`, `diff`, `merge`, `parseJSON`, `get`, `proxy`, `prune`, `seek`
- **Function**: `assert`, `compare`, `compareBy`, `compose`, `configure`, `curry`, `debounce`, `memo`, `once`, `pipe`, `throttle`
- **Math**: `abs`, `allocate`, `average`, `clamp`, `linspace`, `max`, `median`, `min`, `percent`, `range`, `round`, `sum`
- **Date**: `expires`, `interval`, `timeDiff`
- **Money**: `currency`, `exchange`
- **Random**: `draw`, `random`, `shuffle`, `uuid`
- **Typed Namespace**: `is.array`, `is.boolean`, `is.date`, `is.defined`, `is.empty`, `is.equal`, `is.fn`, `is.match`, `is.nil`, `is.number`, `is.object`, `is.primitive`, `is.promise`, `is.regex`, `is.string`, `is.typeOf`

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
