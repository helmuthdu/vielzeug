---
description: MCP server for the Vielzeug ecosystem. Run over stdio or HTTP to expose package metadata, docs, source entrypoints, and Refine component metadata.
package: codex
category: ai-tooling
keywords: [mcp, model-context-protocol, ai-agent, claude, copilot, stdio, http, docs]
related: [refine, spell]
exports: [createServer]
---

# @vielzeug/codex

> MCP server for the Vielzeug ecosystem. Run over stdio or HTTP to expose package metadata, docs, source entrypoints, and Refine component metadata.

[![npm version](https://img.shields.io/npm/v/@vielzeug/codex)](https://www.npmjs.com/package/@vielzeug/codex) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/codex` &nbsp;·&nbsp; **Category:** AI Tooling

**Key exports:** `createServer`, `createServerFromDisk`, `loadData`, `packageMeta`, `validateBundledData`, `startHttpServer`

**When to use:** You want AI clients to query Vielzeug docs and package metadata through a compact MCP tool set.

**Related:** [@vielzeug/refine](https://vielzeug.dev/refine/) · [@vielzeug/spell](https://vielzeug.dev/spell/)

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
| `list-packages`   | —                      | All packages with metadata                                           |
| `get-package`     | `packageSlug`          | Single package metadata by slug                                      |
| `get-docs`        | `packageSlug`, `page?` | Docs page (`index`, `api`, `usage`, `examples`); defaults to `index` |
| `get-source`      | `packageSlug`          | Bundled `src/index.ts` text                                          |
| `search-packages` | `query`                | Ranked search across metadata, keywords, docs, and source            |
| `list-components`          | —                              | Refine component tags from bundled CEM metadata                       |
| `get-component`            | `tagName`                      | Full Refine component CEM declaration by tag                          |
| `generate-template`        | `tagName`, `scenario?`         | Scaffolded HTML snippet for a Refine component                        |
| `get-tokens`               | `filter?`                      | All Refine CSS custom properties, optionally filtered by prefix       |
| `validate-component-usage` | `tagName`, `html`              | Validate AI-generated HTML against CEM spec                          |
| `get-sandbox-context`      | —                              | Execution constraints of the sandbox iframe runtime                  |
| `get-state-bridge-spec`    | —                              | Typed postMessage bridge protocol (HostMessage / SandboxMessage)     |
| `generate-sandbox-document` | `html`, `styles?`             | Complete srcdoc-ready HTML document with CSP and bridge script       |
| `list-directives`           | —                              | All @vielzeug/ore/directives with signatures and descriptions      |
| `list-validators`           | `slug?`                        | All standalone validator functions in a package (default: spell)     |
| `get-type-signature`        | `slug`, `symbol`               | TypeScript export declaration for a named symbol from src/index.ts   |

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

For explicit control over data loading:

```ts
import { createServer, loadData } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

await createServer(loadData()).connect(new StdioServerTransport());
```

## Documentation

- [Overview](https://vielzeug.dev/codex/)
- [Usage Guide](https://vielzeug.dev/codex/usage)
- [API Reference](https://vielzeug.dev/codex/api)
- [Examples](https://vielzeug.dev/codex/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
