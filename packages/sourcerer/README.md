---
description: Typed local and remote data sources for pagination, filtering, sorting, and search.
package: sourcerer
category: data
keywords: [pagination, filtering, sorting, search, data-source, query, remote, local]
related: [courier, ripple, route]
exports: [createLocalSource, createRemoteSource]
---

# /sourcerer

> Typed local and remote data sources for pagination, filtering, sorting, and search.

[![npm version](https://img.shields.io/npm/v//sourcerer)](https://www.npmjs.com/package//sourcerer) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/sourcerer` &nbsp;·&nbsp; **Category:** Data

**Key exports:** `createLocalSource`, `createRemoteSource`

**When to use:** Typed local and remote data sources for pagination, filtering, sorting, and search.

**Related:** [@vielzeug/courier](https://vielzeug.dev/courier/) · [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/route](https://vielzeug.dev/route/)

</details>

`/sourcerer` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /sourcerer
npm install /sourcerer
yarn add /sourcerer
```

## Quick Start

```ts
import { createLocalSource } from '/sourcerer';

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

- [Overview](https://vielzeug.dev/sourcerer/)
- [Usage Guide](https://vielzeug.dev/sourcerer/usage)
- [API Reference](https://vielzeug.dev/sourcerer/api)
- [Examples](https://vielzeug.dev/sourcerer/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
