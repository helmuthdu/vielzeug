# @vielzeug/sourcerer

> Typed reactive data sources for pagination, filtering, sorting, search, and infinite scroll.

[![npm version](https://img.shields.io/npm/v/@vielzeug/sourcerer)](https://www.npmjs.com/package/@vielzeug/sourcerer) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

await source.search('a', { immediate: true });
console.log(source.current); // [{ id: 1, name: 'Ada' }]
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

// autoFetch is true by default — initial data loads immediately
await source.ready();
console.log(source.current, source.meta.totalItems);
```

## Local Search Presets

For large in-memory lists, prefer `searchBy(...)` over the default JSON-stringify search:

```ts
import { createLocalSource, searchBy } from '@vielzeug/sourcerer';

const source = createLocalSource(users, {
  searchFn: searchBy([(u) => u.name, (u) => u.email]),
});
```

## Sources Overview

| Factory                  | Data model         | Navigation                |
| ------------------------ | ------------------ | ------------------------- |
| `createLocalSource()`    | In-memory array    | Page number               |
| `createRemoteSource()`   | Async server fetch | Page number               |
| `createCursorSource()`   | Async server fetch | Cursor tokens (next/prev) |
| `createInfiniteSource()` | Async server fetch | Append (load more)        |

## Error Handling

All async sources expose `meta.error` as a typed `SourceError | null` — not a plain string.
`SourceError` extends `Error` and carries structured context:

```ts
import { sourceState } from '@vielzeug/sourcerer';

const state = sourceState(source);
if (state.status === 'error') {
  console.error(state.error.message); // human-readable message
  console.error(state.error.cause); // original thrown value
  console.error(state.error.context); // structured context bag (query fields, kind, etc.)
}
```

## Documentation

- [Overview](https://vielzeug.dev/sourcerer/)
- [Usage Guide](https://vielzeug.dev/sourcerer/usage)
- [API Reference](https://vielzeug.dev/sourcerer/api)
- [Examples](https://vielzeug.dev/sourcerer/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
