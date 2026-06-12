---
description: MCP server for the Vielzeug ecosystem. Run over stdio or HTTP to expose package metadata, docs, source entrypoints, and Sigil component metadata.
package: codex
category: ai-tooling
keywords: [mcp, model-context-protocol, ai-agent, claude, copilot, stdio, http, docs]
related: [sigil, spell]
exports: [createServer]
---

# @vielzeug/codex

> MCP server for the Vielzeug ecosystem. Run over stdio or HTTP to expose package metadata, docs, source entrypoints, and Sigil component metadata.

[![npm version](https://img.shields.io/npm/v/@vielzeug/codex)](https://www.npmjs.com/package/@vielzeug/codex) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/codex` &nbsp;·&nbsp; **Category:** AI Tooling

**Key exports:** `createServer`, `createServerFromDisk`, `loadData`, `packageMeta`, `validateBundledData`

**When to use:** You want AI clients to query Vielzeug docs and package metadata through a compact MCP tool set.

**Related:** [@vielzeug/sigil](https://vielzeug.dev/sigil/) · [@vielzeug/spell](https://vielzeug.dev/spell/)

</details>

`@vielzeug/codex` ships with bundled snapshot data, so it runs without a local Vielzeug checkout.

## Installation

```sh
pnpm add @vielzeug/codex
npm install @vielzeug/codex
yarn add @vielzeug/codex
```

## Quick Start

Run over stdio (default):

```sh
npx -y @vielzeug/codex
```

Run over HTTP:

```sh
npx -y @vielzeug/codex --port 3100
```

CLI helpers:

```sh
npx -y @vielzeug/codex --help
npx -y @vielzeug/codex --version
```

## Tools

| Tool              | Input                  | Description                                                          |
| ----------------- | ---------------------- | -------------------------------------------------------------------- |
| `list-packages`   | `packageSlug?`         | All packages with metadata; pass `packageSlug` to filter to one      |
| `get-docs`        | `packageSlug`, `page?` | Docs page (`index`, `api`, `usage`, `examples`); defaults to `index` |
| `get-source`      | `packageSlug`          | Bundled `src/index.ts` text                                          |
| `search-packages` | `query`                | Ranked search across metadata, keywords, docs, and source            |
| `list-components` | —                      | Sigil component tags from bundled CEM metadata                       |
| `get-component`   | `tagName`              | Full Sigil component CEM declaration by tag                          |

## Resources

The server also exposes MCP Resources readable by URI:

| URI pattern                     | MIME type           | Content               |
| ------------------------------- | ------------------- | --------------------- |
| `vielzeug://docs/<slug>/<page>` | `text/markdown`     | Documentation page    |
| `vielzeug://source/<slug>`      | `text/x-typescript` | `src/index.ts` source |

## HTTP mode

- MCP endpoint: `http://localhost:<port>/`
- Health check: `http://localhost:<port>/health`

## Programmatic API

`createServerFromDisk()` is the simplest entry point — one call, no arguments:

```ts
import { createServerFromDisk } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

await createServerFromDisk().connect(new StdioServerTransport());
```

For explicit control, use `createServer(loadData())`.

## Documentation

- [Overview](https://vielzeug.dev/codex/)
- [Usage Guide](https://vielzeug.dev/codex/usage)
- [API Reference](https://vielzeug.dev/codex/api)
- [Examples](https://vielzeug.dev/codex/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
