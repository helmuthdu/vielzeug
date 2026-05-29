---
title: Mcp — MCP server for the Vielzeug ecosystem
description: MCP server exposing Vielzeug package metadata, docs pages, source entrypoints, and Block component metadata over stdio or HTTP.
package: mcp
category: ai-tooling
keywords: [mcp, model-context-protocol, ai-agent, claude, copilot, stdio, http, docs]
related: [block, sieve]
exports: [createServer]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="mcp" />

<img src="/logo-mcp.svg" alt="Mcp logo" width="156" class="logo-highlight"/>

# Mcp

`@vielzeug/mcp` is the Model Context Protocol server for the Vielzeug ecosystem. It provides a compact tool API for package discovery, documentation lookup, source inspection, and Block component metadata.

## What it exposes

### Tools

| Tool | Input | Description |
| --- | --- | --- |
| `list-packages` | — | All packages with metadata (`availableDocPages`, `hasSource`, category, exports, related, etc.) |
| `get-package` | `packageSlug` | Metadata for a single package |
| `get-docs` | `packageSlug`, `page?` | Package docs page (`index`, `api`, `usage`, `examples`) |
| `get-source` | `packageSlug` | Bundled `src/index.ts` text for a package |
| `search-packages` | `query` | Search package metadata and docs content with ranked matches |
| `list-components` | — | Block component tags from bundled metadata |
| `get-component` | `tagName` | Full Block component declaration by tag |

### Transports

- **Stdio (default)** for local MCP clients
- **Streamable HTTP** with `--port <number>` for remote agents

## Quick start

```sh
# standalone (stdio)
pnpm dlx @vielzeug/mcp
# or
npx -y @vielzeug/mcp

# standalone (HTTP)
pnpm dlx @vielzeug/mcp --port 3100

# cli helpers
pnpm dlx @vielzeug/mcp --help
pnpm dlx @vielzeug/mcp --version
```

Then wire it into your AI client — see the [Usage Guide](./usage.md).

## Why this design

- **Small tool surface**: seven focused tools, no redundant endpoints
- **Snapshot-backed**: runs without monorepo checkout
- **Fail-fast startup**: missing bundled data aborts immediately
- **Predictable search behavior**: `search-packages` returns ranked matches or `[]`
- **Clear source lookup**: `get-source` is a dedicated source endpoint

## Requirements

- Node 22+
- For monorepo development only: `packages/mcp/dist/cli.js` from `pnpm build`

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Block](/block/)
- [Sieve](/sieve/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
