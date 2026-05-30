---
description: Typed reactive data sources for pagination, filtering, sorting, search, and infinite scroll.
package: sourcerer
category: data
keywords: [pagination, filtering, sorting, search, data-source, query, remote, local, cursor, infinite-scroll]
related: [courier, ripple, wayfinder]
exports: [createLocalSource, createRemoteSource, createCursorSource, createInfiniteSource, toSignals]
---

# @vielzeug/sourcerer

> Typed reactive data sources for pagination, filtering, sorting, search, and infinite scroll.

[![npm version](https://img.shields.io/npm/v/@vielzeug/sourcerer)](https://www.npmjs.com/package/@vielzeug/sourcerer) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/sourcerer` &nbsp;·&nbsp; **Category:** Data

**Key exports:** `createLocalSource`, `createRemoteSource`, `createCursorSource`, `createInfiniteSource`, `toSignals`

**When to use:** Typed, reactive list models with consistent pagination, filtering, sorting, and search across local and remote data.

**Related:** [@vielzeug/courier](https://vielzeug.dev/courier/) · [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/wayfinder](https://vielzeug.dev/wayfinder/)

</details>

`@vielzeug/sourcerer` is part of Vielzeug and ships as a TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/sourcerer
npm install @vielzeug/sourcerer
yarn add @vielzeug/sourcerer
```

## Quick Start

```ts
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource(
  [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
    { id: 3, name: 'Linus' },
  ],
  { limit: 2 },
);

await source.searchNow('a');
console.log(source.current);       // [{ id: 1, name: 'Ada' }]
console.log(source.meta.pageNumber); // 1
```

```ts
import { createRemoteSource } from '@vielzeug/sourcerer';

const source = createRemoteSource({
  fetch: async ({ limit, page, search }, signal) => {
    const res = await fetch(`/api/users?page=${page}&limit=${limit}&q=${search ?? ''}`, { signal });
    return res.json(); // { items: User[], total: number }
  },
  limit: 20,
});

await source.ready();
console.log(source.current, source.meta.totalItems);
```

## Sources at a Glance

| Factory | Data model | Navigation |
|---|---|---|
| `createLocalSource()` | In-memory array | Page number |
| `createRemoteSource()` | Async server fetch | Page number |
| `createCursorSource()` | Async server fetch | Cursor tokens (next/prev) |
| `createInfiniteSource()` | Async server fetch | Append (load more) |

## Documentation

- [Overview](https://vielzeug.dev/sourcerer/)
- [Usage Guide](https://vielzeug.dev/sourcerer/usage)
- [API Reference](https://vielzeug.dev/sourcerer/api)
- [Examples](https://vielzeug.dev/sourcerer/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
