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
- Health check: `http://localhost:3100/health` → `{ "status": "ok", "version": "<snapshot version>" }`

### Custom data snapshot

Point the CLI at a snapshot file other than the built-in bundled one with `--data`:

```sh
npx -y @vielzeug/codex --data ./my-snapshot.json
```

Combine with `--port` for HTTP mode. Useful for testing a locally regenerated snapshot without
reinstalling the package.

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
list-packages                                   → scan catalog, note availableDocPages + exampleIds
search-packages { query: "form validation" }   → multi-word AND search across all fields
get-package { packageSlug: "forge" }            → structured metadata for one package
get-docs { packageSlug: "forge", page: "usage" }     → how-to guide
get-docs { packageSlug: "forge", page: "api" }       → full API reference
get-source { packageSlug: "forge" }                  → exact exported signatures
get-type-signature { slug: "forge", symbol: "createForm" }  → one exported declaration, no full-source read
```

To find and run a REPL example:

```
list-examples { packageSlug: "arsenal" }              → enumerate example ids for a package
get-example { packageSlug: "arsenal", exampleId: "function-debounce" }  → full runnable code
```

For Refine component queries:

```
refine-list-components                              → enumerate available tag names
refine-get-component { tagName: "ore-input" }       → full CEM declaration
refine-generate-template { tagName: "ore-input" }   → scaffolded HTML snippet
refine-validate-usage { tagName: "ore-input", html: "<ore-input placeholder=\"x\">" }  → catch typos before rendering
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

If `refine-list-components` returns an error about missing Refine metadata, build `@vielzeug/refine` first so `packages/refine/dist/custom-elements.json` is available during bundling.

## Security Notes

- **HTTP mode binds with `Access-Control-Allow-Origin: *`** — any local web page can make cross-origin requests to the server. Do not expose the HTTP port on a publicly accessible interface. Use stdio mode for production/shared environments.
- **Never expose the HTTP port through a firewall or proxy** — the MCP endpoint has no authentication. Treat it as a local-only service.

## Embedding in a Node.js Process

When you need the MCP server as part of a larger Node.js process rather than a standalone binary, import and wire it directly:

```ts
import { createServerFromDisk } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createServerFromDisk();
await server.connect(new StdioServerTransport());
```

For HTTP transport in CI or a container, use the binary directly:

```sh
codex --port 3100
# or without installing:
npx -y @vielzeug/codex --port 3100
```

## Working with Other Vielzeug Libraries

**With Refine** — the codex MCP server exposes Refine component metadata via `refine-list-components` and `refine-get-component`. After building `@vielzeug/refine`, the `custom-elements.json` is bundled into the MCP data so AI agents can query component attributes, slots, and events:

```bash
# Ensure Refine CEM is available before bundling codex
pnpm --filter @vielzeug/refine build
pnpm --filter @vielzeug/codex run prepare:data
```

An AI agent can then call:

```jsonc
// list all ore- components
{ "tool": "refine-list-components" }

// get full declaration for ore-button
{ "tool": "refine-get-component", "arguments": { "tagName": "ore-button" } }
```

**With Spell** — codex exposes `spell` documentation so AI agents can discover the schema validation API without leaving the MCP session:

```jsonc
{ "tool": "get-docs", "arguments": { "packageSlug": "spell", "page": "api" } }
```

This returns the complete `spell` API reference, letting an agent write correct validation schemas without browsing external docs.

## Best Practices

- Call `list-packages` first to discover `availableDocPages` and `exampleIds`, then `get-package` with `packageSlug` for a focused view before calling `get-docs` — not every package has every page or example.
- Prefer `search-packages` over iterating `list-packages` manually when looking for a capability. Multi-word queries are supported — all words must match.
- Use `get-source` for the exact public API surface; prefer `get-type-signature` when you only need one symbol's declaration — it avoids loading the full file.
- Use `list-examples` + `get-example` to show a real, runnable snippet instead of hand-writing one from docs alone.
- In HTTP mode, check `/health` before routing traffic to verify the server is up and which snapshot `version` it's serving.
- Pin a version in production (`npx @vielzeug/codex@3.0.1`) to avoid surprise data changes from snapshot updates.
