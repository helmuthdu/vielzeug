---
description: MCP server for the Vielzeug ecosystem. Run over stdio or HTTP to expose package metadata, docs, source entrypoints, and Block component metadata.
package: mcp
category: ai-tooling
keywords: [mcp, model-context-protocol, ai-agent, claude, copilot, stdio, http, docs]
related: [block, sieve]
exports: [createServer]
---

# /mcp

> MCP server for the Vielzeug ecosystem. Run over stdio or HTTP to expose package metadata, docs, source entrypoints, and Block component metadata.

[![npm version](https://img.shields.io/npm/v//mcp)](https://www.npmjs.com/package//mcp) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/mcp` &nbsp;·&nbsp; **Category:** AI Tooling

**Key exports:** `createServer`

**When to use:** You want AI clients to query Vielzeug docs and package metadata through a compact MCP tool set.

**Related:** [@vielzeug/block](https://vielzeug.dev/block/) · [@vielzeug/sieve](https://vielzeug.dev/sieve/)

</details>

`/mcp` is part of Vielzeug and ships with bundled snapshot data, so it runs without a local Vielzeug checkout.

## Installation

```sh
pnpm add /mcp
npm install /mcp
yarn add /mcp
```

## Quick Start

Run over stdio (default):

```sh
npx -y /mcp
```

Run over HTTP:

```sh
npx -y /mcp --port 3100
```

Inspect CLI flags:

```sh
npx -y /mcp --help
npx -y /mcp --version
```

## Tool API

| Tool | Input | Description |
| --- | --- | --- |
| `list-packages` | none | List all packages with metadata including `availableDocPages` and `hasSource` |
| `get-package` | `packageSlug` | Get metadata for one package |
| `get-docs` | `packageSlug`, `page?` | Read docs page (`index`, `api`, `usage`, `examples`) |
| `get-source` | `packageSlug` | Read bundled `src/index.ts` text |
| `search-packages` | `query` | Ranked search across metadata, keywords, docs, and source |
| `list-components` | none | List `/block` component tags |
| `get-component` | `tagName` | Get full Block component declaration by tag |

## HTTP mode endpoints

- MCP endpoint: `http://localhost:<port>/`
- Health endpoint: `http://localhost:<port>/health`

## Programmatic API

`createServer(data)` is exported for custom runtime wiring.

```ts
import { createServer } from '/mcp';

// See docs for complete setup; this snippet documents the public symbol.
void createServer;
```

## Documentation

- [Overview](https://vielzeug.dev/mcp/)
- [Usage Guide](https://vielzeug.dev/mcp/usage)
- [API Reference](https://vielzeug.dev/mcp/api)
- [Examples](https://vielzeug.dev/mcp/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
