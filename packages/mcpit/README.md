---
description: MCP server for the Vielzeug ecosystem. Run over stdio or HTTP to expose package metadata, docs, source entrypoints, and Buildit component metadata.
package: mcpit
category: ai-tooling
keywords: [mcp, model-context-protocol, ai-agent, claude, copilot, stdio, http, docs]
related: [buildit, validit]
exports: [createServer]
---

# @vielzeug/mcpit

> MCP server for the Vielzeug ecosystem. Run over stdio or HTTP to expose package metadata, docs, source entrypoints, and Buildit component metadata.

[![npm version](https://img.shields.io/npm/v/@vielzeug/mcpit)](https://www.npmjs.com/package/@vielzeug/mcpit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/mcpit` &nbsp;·&nbsp; **Category:** AI Tooling

**Key exports:** `createServer`

**When to use:** You want AI clients to query Vielzeug docs and package metadata through a compact MCP tool set.

**Related:** [@vielzeug/buildit](https://vielzeug.dev/buildit/) · [@vielzeug/validit](https://vielzeug.dev/validit/)

</details>

`@vielzeug/mcpit` is part of Vielzeug and ships with bundled snapshot data, so it runs without a local Vielzeug checkout.

## Installation

```sh
pnpm add @vielzeug/mcpit
npm install @vielzeug/mcpit
yarn add @vielzeug/mcpit
```

## Quick Start

Run over stdio (default):

```sh
npx -y @vielzeug/mcpit
```

Run over HTTP:

```sh
npx -y @vielzeug/mcpit --port 3100
```

Inspect CLI flags:

```sh
npx -y @vielzeug/mcpit --help
npx -y @vielzeug/mcpit --version
```

## Tool API

| Tool | Input | Description |
| --- | --- | --- |
| `list-packages` | none | List all packages with metadata including `availableDocPages` and `hasSource` |
| `get-package` | `packageSlug` | Get metadata for one package |
| `get-docs` | `packageSlug`, `page?` | Read docs page (`index`, `api`, `usage`, `examples`) |
| `get-source` | `packageSlug` | Read bundled `src/index.ts` text |
| `search-packages` | `query` | Ranked search across metadata, keywords, docs, and source |
| `list-components` | none | List `@vielzeug/buildit` component tags |
| `get-component` | `tagName` | Get full Buildit component declaration by tag |

## HTTP mode endpoints

- MCP endpoint: `http://localhost:<port>/`
- Health endpoint: `http://localhost:<port>/health`

## Programmatic API

`createServer(data)` is exported for custom runtime wiring.

```ts
import { createServer } from '@vielzeug/mcpit';

// See docs for complete setup; this snippet documents the public symbol.
void createServer;
```

## Documentation

- [Overview](https://vielzeug.dev/mcpit/)
- [Usage Guide](https://vielzeug.dev/mcpit/usage)
- [API Reference](https://vielzeug.dev/mcpit/api)
- [Examples](https://vielzeug.dev/mcpit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
