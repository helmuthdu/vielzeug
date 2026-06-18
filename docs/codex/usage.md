---
title: Codex — Usage Guide
description: Install, run, and connect AI clients to the Vielzeug MCP server.
---

[[toc]]

::: tip New to MCP?
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
list-packages                                   → scan catalog, note availableDocPages
search-packages { query: "form validation" }   → multi-word AND search across all fields
list-packages { packageSlug: "forge" }  → structured metadata for one package
get-docs { packageSlug: "forge", page: "usage" }     → how-to guide
get-docs { packageSlug: "forge", page: "api" }       → full API reference
get-source { packageSlug: "forge" }                  → exact exported signatures
```

For Sigil component queries:

```
list-components                              → enumerate available tag names
get-component { tagName: "sg-input" }       → full CEM declaration
```

## Programmatic Usage

For the common case, use `createServerFromDisk()` — it calls `loadData()` internally:

```ts
import { createServerFromDisk } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

await createServerFromDisk().connect(new StdioServerTransport());
```

When you need explicit control over when data is loaded, use `createServer` with `loadData` separately:

```ts
import { createServer, loadData } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const data = loadData();
const server = createServer(data);
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

## Security Notes

- **HTTP mode binds with `Access-Control-Allow-Origin: *`** — any local web page can make cross-origin requests to the server. Do not expose the HTTP port on a publicly accessible interface. Use stdio mode for production/shared environments.
- **Never expose the HTTP port through a firewall or proxy** — the MCP endpoint has no authentication. Treat it as a local-only service.

## Framework Integration

Codex is an MCP server, not a browser library. There is no direct framework integration — connect it from your AI client configuration. For server-side usage, embed the server programmatically:

```ts
import { createServerFromDisk } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Start the MCP server as part of a larger Node.js process:
const server = createServerFromDisk();
await server.connect(new StdioServerTransport());
```

For HTTP-based agents running in CI or a container:

```sh
node -e "require('@vielzeug/codex/dist/cli.js')" -- --port 3100
```

## Working with Other Vielzeug Libraries

**With Sigil** — the codex MCP server exposes Sigil component metadata via `list-components` and `get-component`. After building `@vielzeug/sigil`, the `custom-elements.json` is bundled into the MCP data so AI agents can query component attributes, slots, and events:

```bash
# Ensure Sigil CEM is available before bundling codex
pnpm --filter @vielzeug/sigil build
pnpm --filter @vielzeug/codex run prepare:data
```

An AI agent can then call:

```jsonc
// list all sg- components
{ "tool": "list-components" }

// get full declaration for sg-button
{ "tool": "get-component", "arguments": { "tagName": "sg-button" } }
```

**With Spell** — codex exposes `spell` documentation so AI agents can discover the schema validation API without leaving the MCP session:

```jsonc
{ "tool": "get-docs", "arguments": { "packageSlug": "spell", "page": "api" } }
```

This returns the complete `spell` API reference, letting an agent write correct validation schemas without browsing external docs.

## Best Practices

- Call `list-packages` first to discover `availableDocPages` before calling `get-docs` — not every package has every page.
- Prefer `search-packages` over iterating `list-packages` manually when looking for a capability. Multi-word queries are supported — all words must match.
- Use `get-source` for the exact public API surface; do not infer exports from docs alone.
- In HTTP mode, check `/health` before routing traffic to verify the server is up.
- Pin a version in production (`npx @vielzeug/codex@3.0.1`) to avoid surprise data changes from snapshot updates.
