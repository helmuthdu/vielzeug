---
description: Typed local and remote data sources for pagination, filtering, sorting, and search.
package: sourceit
category: data
keywords: [pagination, filtering, sorting, search, data-source, query, remote, local]
related: [fetchit, stateit, routeit]
exports: [createLocalSource, createRemoteSource]
---

# @vielzeug/sourceit

> Typed local and remote data sources for pagination, filtering, sorting, and search.

[![npm version](https://img.shields.io/npm/v/@vielzeug/sourceit)](https://www.npmjs.com/package/@vielzeug/sourceit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/sourceit` &nbsp;·&nbsp; **Category:** Data

**Key exports:** `createLocalSource`, `createRemoteSource`

**When to use:** Typed local and remote data sources for pagination, filtering, sorting, and search.

**Related:** [@vielzeug/fetchit](https://vielzeug.dev/fetchit/) · [@vielzeug/stateit](https://vielzeug.dev/stateit/) · [@vielzeug/routeit](https://vielzeug.dev/routeit/)

</details>

`@vielzeug/sourceit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/sourceit
npm install @vielzeug/sourceit
yarn add @vielzeug/sourceit
```

## Quick Start

```ts
import { createLocalSource } from '@vielzeug/sourceit';

const source = createLocalSource(
  [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
    { id: 3, name: 'Linus' },
  ],
  { limit: 2 },
);

source.searchNow('a');

console.log(source.current);
console.log(source.meta.pageNumber);
```

## Documentation

- [Overview](https://vielzeug.dev/sourceit/)
- [Usage Guide](https://vielzeug.dev/sourceit/usage)
- [API Reference](https://vielzeug.dev/sourceit/api)
- [Examples](https://vielzeug.dev/sourceit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
