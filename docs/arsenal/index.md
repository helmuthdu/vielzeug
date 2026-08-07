---
title: Arsenal — Utility library for TypeScript
description: Tree-shakeable TypeScript utilities with focused category entry points for arrays, async work, caching, objects, strings, math, and guards.
package: arsenal
category: utilities
keywords: [utility, array, string, object, math, async, debounce, throttle, cache]
exports: [chunk, groupBy, retry, debounce, clamp, isEqual, taskPool, cache, fuzzyFilter, tryParseJson]
related: [tempo, sourcerer, spell, coins]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="arsenal" />

## Why Arsenal?

Arsenal keeps common utilities at package root and places specialized behavior behind category entry points. This keeps autocomplete focused while preserving one dependency and tree-shakeable modules.

```ts
// Before
const users = JSON.parse(raw).filter((user) => user.name.includes(query));

// After
import { fuzzyFilter } from '@vielzeug/arsenal/array';
import { tryParseJson } from '@vielzeug/arsenal/object';

const parsed = tryParseJson(raw);
const users = parsed.ok ? fuzzyFilter(parsed.value as User[], query, { select: (user) => user.name }) : [];
```

| Feature | Arsenal | lodash-es | Remeda |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="arsenal" type="size" /> | ~72 kB | ~18 kB |
| Typed root utilities | <ore-icon name="check" size="16"></ore-icon> | Partial | <ore-icon name="check" size="16"></ore-icon> |
| Category entry points | <ore-icon name="check" size="16"></ore-icon> | Partial | Partial |
| Async task pool and cache | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Zero dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

<div class="decision-callout">

**Use Arsenal when** you need one typed utility dependency with focused subpaths for specialized behavior.

**Consider narrower alternatives when** you need only platform APIs or a small functional subset.

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
import { chunk, groupBy, retry } from '@vielzeug/arsenal';
import { cache } from '@vielzeug/arsenal/cache';
import { taskPool } from '@vielzeug/arsenal/async';

const pages = chunk([1, 2, 3, 4, 5], 2);
const byRole = groupBy([{ role: 'admin' }, { role: 'user' }], (user) => user.role);

const pool = taskPool({ concurrency: 2 });
const health = await pool.run((signal) => retry(() => fetch('/health', { signal }).then((response) => response.json())));

const responses = cache<string, unknown>({ ttlMs: 60_000 });
const profile = await responses.getOrLoad('/profile', () => fetch('/profile').then((response) => response.json()));

pool.dispose();
console.log(pages, byRole, health, profile);
```

## Features

<div class="features-grid">

- **`chunk`**: common array/string chunking from package root
- **`retry`**: retry async work with cancellation support from package root
- **`taskPool`**: bounded, disposable concurrent work from `/async`
- **`cache`**: identity-keyed TTL cache with async load deduplication from `/cache`
- **`fuzzyFilter`**: explicit-field fuzzy filtering from `/array`
- **`tryParseJson`**: preserve JSON syntax failures from `/object`
- **`clamp`**: numeric bounds from package root
- **`isEqual`**: structural equality from package root

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Spell](/spell/) — validate `unknown` JSON data after `tryParseJson`.
- [Vault](/vault/) — persistent storage; Arsenal cache is in-memory only.
- [Tempo](/tempo/) — date/time utilities kept outside Arsenal.
- [Coins](/coins/) — money formatting and currency conversion.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
