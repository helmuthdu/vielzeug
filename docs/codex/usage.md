---
title: Codex — Usage Guide
description: Install, run, and connect AI clients to the Vielzeug MCP server.
---

[[toc]]

::: tip New to Mcp?
Start with the [Overview](./index.md), then use this page for setup and client configuration.
:::

## Basic Usage

Run the server over stdio (the default transport):

```sh
npx -y @vielzeug/codex
```

That is enough for Claude Desktop or Copilot Chat to connect and start calling tools.

## Transport Modes

### Stdio (default)

The server communicates over stdin/stdout. Use this for local clients.

```sh
npx -y @vielzeug/codex
```

### HTTP / Streamable HTTP

Run with `--port` to expose an HTTP endpoint for remote agents.

```sh
npx -y @vielzeug/codex --port 3100
```

HTTP endpoints:

- MCP endpoint: `http://localhost:3100/`
- Health check: `http://localhost:3100/health`

## Connect Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vielzeug": {
      "command": "npx",
      "args": ["-y", "@vielzeug/codex"]
    }
  }
}
```

## Connect GitHub Copilot Chat

Create or extend `.vscode/mcp.json` in your workspace root.

::: code-group

```json [Stdio]
{
  "servers": {
    "vielzeug": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@vielzeug/codex"]
    }
  }
}
```

```json [HTTP]
{
  "servers": {
    "vielzeug": {
      "type": "http",
      "url": "http://localhost:3100/"
    }
  }
}
```

:::

## Recommended Tool Workflow

Typical AI-agent pattern from discovery to code generation:

```
list-packages                           → scan catalog, note availableDocPages
search-packages { query: "forms" }      → find relevant packages by capability
list-packages { packageSlug: "forge" }  → structured metadata for one package
get-docs { packageSlug: "forge", page: "usage" }     → how-to guide
get-docs { packageSlug: "forge", page: "api" }       → full API reference
get-source { packageSlug: "forge" }                  → exact exported signatures
```

For Sigil component queries:

```
list-components                              → enumerate available tag names
get-component { tagName: "bit-input" }       → full CEM declaration
```

## Programmatic Usage

Use `createServer` with `loadData` to embed the MCP server in a custom Node.js application.

```ts
import { createServer, loadData } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createServer(loadData());
await server.connect(new StdioServerTransport());
```

To load data from a custom snapshot file, use `validateBundledData`:

```ts
import { validateBundledData } from '@vielzeug/codex';
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('./my-snapshot.json', 'utf8'));
const data = validateBundledData(raw);
```

## Monorepo Development

Use this mode only when developing `@vielzeug/codex` itself.

```sh
cd packages/codex
pnpm build   # compile TypeScript
pnpm test    # run test suite (regenerates bundled data first)
node dist/cli.js
```

Bundled data is regenerated automatically before `build` and `test`.

Manual refresh:

```sh
cd packages/codex
pnpm run prepare:data
```

If `list-components` returns an error about missing Sigil metadata, build `@vielzeug/sigil` first so `packages/sigil/dist/custom-elements.json` is available during bundling.

## Best Practices

- Call `list-packages` first to discover `availableDocPages` before calling `get-docs` — not every package has every page.
- Prefer `search-packages` over iterating `list-packages` manually when looking for a capability.
- Use `get-source` for the exact public API surface; do not infer exports from docs alone.
- In HTTP mode, check `/health` before routing traffic to verify the server is up.
- Pin a version in production (`npx @vielzeug/codex@3.0.1`) to avoid surprise data changes from snapshot updates.
