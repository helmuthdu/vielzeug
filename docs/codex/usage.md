---
title: Codex — Setup Guide
description: Connect your AI assistant to the Vielzeug MCP server — client configs, HTTP mode, programmatic embedding, and development workflow.
---

[[toc]]

::: tip
Not familiar with Codex yet? Start with the [Overview](./index.md).
:::

## Running the Server

Codex ships a CLI. No installation required — run it with `npx`:

```sh
npx -y @vielzeug/codex          # stdio (default)
npx -y @vielzeug/codex --port 3100  # HTTP mode
npx -y @vielzeug/codex --help
npx -y @vielzeug/codex --version
```

The server loads all package data from a bundled snapshot and starts immediately. There are no config files and no network requests at runtime.

## Client Setup

### Claude Desktop

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

Restart Claude Desktop after saving. The tools appear automatically in the next session.

### GitHub Copilot Chat

Create or extend `.vscode/mcp.json` in your workspace root:

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

### Cursor

Create or extend `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project-level):

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

### Other MCP Clients

Any client that supports the MCP stdio transport works. Point it at:

```sh
npx -y @vielzeug/codex
```

For HTTP-capable clients, start the server with `--port` and point the client at `http://localhost:<port>/`.

## HTTP Mode

Use HTTP mode for remote agents, CI pipelines, or teams sharing one server instance:

```sh
npx -y @vielzeug/codex --port 3100
```

| Endpoint                    | Purpose                                |
| --------------------------- | -------------------------------------- |
| `http://localhost:3100/`    | MCP Streamable HTTP endpoint           |
| `http://localhost:3100/health` | Health check — returns `{"status":"ok"}` |

The server registers `SIGTERM` and `SIGINT` handlers and exits cleanly on signal.

::: warning Local only
HTTP mode binds with `Access-Control-Allow-Origin: *` and has **no authentication**. Never expose the port on a publicly accessible interface or through a reverse proxy without adding auth yourself.
:::

## Recommended Tool Workflow

A typical AI-agent session for discovering and using a package:

```
list-packages                                        → scan the full catalogue
search-packages { query: "form validation" }         → find the right package
get-package     { packageSlug: "forge" }             → read its metadata
get-docs        { packageSlug: "forge", page: "usage" }  → how-to guide
get-docs        { packageSlug: "forge", page: "api" }    → full API reference
get-source      { packageSlug: "forge" }             → exact exported types
```

For Sigil component work:

```
list-components                                  → enumerate all sg-* components
get-component { tagName: "sg-input" }           → attributes, slots, events, CSS parts
```

## Programmatic Embedding

Codex exposes a Node.js API for embedding the server inside a larger process.

**Simplest form** — `createServerFromDisk()` handles data loading internally:

```ts
import { createServerFromDisk } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

await createServerFromDisk().connect(new StdioServerTransport());
```

**With explicit data loading** — useful when you want to validate data before starting:

```ts
import { createServer, loadData } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const data = loadData();          // throws with actionable message if data is missing/malformed
const server = createServer(data);
await server.connect(new StdioServerTransport());
```

**Custom snapshot** — load data from a different path:

```ts
import { validateBundledData } from '@vielzeug/codex';
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('./my-snapshot.json', 'utf8'));
const data = validateBundledData(raw); // throws if schema is invalid
```

## Security Notes

- **HTTP mode has no authentication.** Any process that can reach the port can call all tools. Treat it as a local-only service.
- **Do not expose the HTTP port through a firewall or reverse proxy** without adding authentication at the proxy layer.
- **Stdio mode is safe** — the server only communicates over the pipes the client opens; there is no listening socket.

## Pinning a Version

Snapshot content changes with each release. Pin a version in long-lived configs to avoid surprise changes:

```json
{
  "mcpServers": {
    "vielzeug": {
      "command": "npx",
      "args": ["@vielzeug/codex@3.0.1"]
    }
  }
}
```

## Monorepo Development

Use this when working on `@vielzeug/codex` itself:

```sh
cd packages/codex
pnpm build          # compile TypeScript + regenerate bundled data
pnpm test           # run test suite (regenerates bundled data first)
node dist/cli.js    # run the compiled server
```

Manually refresh the bundled data snapshot:

```sh
pnpm --filter @vielzeug/codex run prepare:data
```

::: tip Sigil metadata
If `list-components` returns an error about missing Sigil metadata, build `@vielzeug/sigil` first so `packages/sigil/dist/custom-elements.json` is available during bundling:

```sh
pnpm --filter @vielzeug/sigil build
pnpm --filter @vielzeug/codex run prepare:data
```

:::

## Best Practices

- Call `list-packages` first and check `availableDocPages` before calling `get-docs` — not every package has every page.
- Prefer `search-packages` over iterating `list-packages` manually. Multi-word queries are AND-matched across all fields.
- Use `get-source` for exact type signatures; do not infer exports from docs text alone.
- In HTTP mode, poll `/health` before routing traffic to confirm the server is ready.
