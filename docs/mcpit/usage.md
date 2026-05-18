---
title: Mcpit — Usage Guide
description: Install, run, and connect AI clients to the current Vielzeug MCP server implementation.
---

[[toc]]

::: tip New to Mcpit?
Start with the [Overview](./index.md), then use this page for setup and client configuration.
:::

## Quick setup (standalone)

`@vielzeug/mcpit` ships with bundled snapshot data, so no Vielzeug checkout is required for normal use.

```sh
npx -y @vielzeug/mcpit
```

HTTP mode:

```sh
npx -y @vielzeug/mcpit --port 3100
```

CLI helpers:

```sh
npx -y @vielzeug/mcpit --help
npx -y @vielzeug/mcpit --version
```

## Quick setup (monorepo development)

Use this mode only when developing `mcpit` itself.

```sh
cd /path/to/vielzeug/packages/mcpit
pnpm build
pnpm test
node dist/cli.js
```

## Transport modes

### Stdio (default)

The MCP server communicates over stdin/stdout and is ideal for local clients such as Claude Desktop and Copilot Chat.

### HTTP / Streamable HTTP (`--port`)

Run with `--port <number>` to expose an HTTP endpoint for remote agents.

```sh
npx -y @vielzeug/mcpit --port 3100
```

HTTP endpoints:

- MCP endpoint: `http://localhost:3100/`
- Health endpoint: `http://localhost:3100/health`

## Connect Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vielzeug": {
      "command": "npx",
      "args": ["-y", "@vielzeug/mcpit"]
    }
  }
}
```

## Connect GitHub Copilot Chat

Create or extend `.vscode/mcp.json` in your workspace root.

### Stdio

```json
{
  "servers": {
    "vielzeug": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@vielzeug/mcpit"]
    }
  }
}
```

### HTTP

```json
{
  "servers": {
    "vielzeug": {
      "type": "http",
      "url": "http://localhost:3100/"
    }
  }
}
```

## Recommended tool workflow

Typical AI-agent flow:

1. `list-packages` to inspect package catalog and available pages
2. `search-packages` to find relevant packages by capability
3. `get-package` for structured metadata of the selected package
4. `get-docs` with `page: "usage"`, `"api"`, or `"examples"` for docs
5. `get-source` for `src/index.ts`

For Buildit component queries:

1. `list-components`
2. `get-component`

## Keeping bundled data fresh (monorepo)

Bundled data is regenerated before `build` and `test` in `packages/mcpit`.

Manual refresh:

```sh
cd /path/to/vielzeug/packages/mcpit
pnpm run prepare:data
```

If Buildit component metadata is missing in results, build `@vielzeug/buildit` first so `packages/buildit/dist/custom-elements.json` is available when bundling.
