---
description: MCP server for the Vielzeug ecosystem. Run over stdio or HTTP to expose package metadata, docs, source entrypoints, and Block component metadata.
package: mcp
category: ai-tooling
keywords: [mcp, model-context-protocol, ai-agent, claude, copilot, stdio, http, docs]
related: [block, sieve]
exports: [createServer]
---

# @vielzeug/mcp

> MCP server for the Vielzeug ecosystem. Run over stdio or HTTP to expose package metadata, docs, source entrypoints, and Block component metadata.

[![npm version](https://img.shields.io/npm/v/@vielzeug/mcp)](https://www.npmjs.com/package/@vielzeug/mcp) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/mcp` &nbsp;·&nbsp; **Category:** AI Tooling

**Key exports:** `createServer`

**When to use:** You want AI clients to query Vielzeug docs and package metadata through a compact MCP tool set.

**Related:** [@vielzeug/block](https://vielzeug.dev/block/) · [@vielzeug/sieve](https://vielzeug.dev/sieve/)

</details>

`@vielzeug/mcp` ships with bundled snapshot data, so it runs without a local Vielzeug checkout.

## Installation

```sh
pnpm add @vielzeug/mcp
npm install @vielzeug/mcp
yarn add @vielzeug/mcp
```

## Quick Start

Run over stdio (default):

```sh
npx -y @vielzeug/mcp
```

Run over HTTP:

```sh
npx -y @vielzeug/mcp --port 3100
```

CLI helpers:

```sh
npx -y @vielzeug/mcp --help
npx -y @vielzeug/mcp --version
```

## Tools

| Tool | Input | Description |
| --- | --- | --- |
| `list-packages` | `packageSlug?` | All packages with metadata; pass `packageSlug` to filter to one |
| `get-docs` | `packageSlug`, `page?` | Docs page (`index`, `api`, `usage`, `examples`); defaults to `index` |
| `get-source` | `packageSlug` | Bundled `src/index.ts` text |
| `search-packages` | `query` | Ranked search across metadata, keywords, docs, and source |
| `list-components` | — | Block component tags from bundled CEM metadata |
| `get-component` | `tagName` | Full Block component CEM declaration by tag |

## Resources

The server also exposes MCP Resources readable by URI:

| URI pattern | MIME type | Content |
| --- | --- | --- |
| `vielzeug://docs/<slug>/<page>` | `text/markdown` | Documentation page |
| `vielzeug://source/<slug>` | `text/x-typescript` | `src/index.ts` source |

## HTTP mode

- MCP endpoint: `http://localhost:<port>/`
- Health check: `http://localhost:<port>/health`

## Programmatic API

`createServer(data)` is exported for custom runtime wiring.

```ts
import { createServer } from '@vielzeug/mcp';
import { loadData } from '@vielzeug/mcp/data';

const server = createServer(loadData());
```

## Documentation

- [Overview](https://vielzeug.dev/mcp/)
- [Usage Guide](https://vielzeug.dev/mcp/usage)
- [API Reference](https://vielzeug.dev/mcp/api)
- [Examples](https://vielzeug.dev/mcp/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
