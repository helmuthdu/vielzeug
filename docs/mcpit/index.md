---
title: Mcpit — MCP server for the Vielzeug ecosystem
description: MCP server exposing Vielzeug package metadata, docs pages, source entrypoints, and Buildit component metadata over stdio or HTTP.
package: mcpit
category: ai-tooling
keywords: [mcp, model-context-protocol, ai-agent, claude, copilot, stdio, http, docs]
related: [buildit, validit]
exports: [createServer]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="mcpit" />

<img src="/logo-mcpit.svg" alt="Mcpit logo" width="156" class="logo-highlight"/>

# Mcpit

`@vielzeug/mcpit` is the Model Context Protocol server for the Vielzeug ecosystem. It provides a compact tool API for package discovery, documentation lookup, source inspection, and Buildit component metadata.

## What it exposes

### Tools

| Tool | Input | Description |
| --- | --- | --- |
| `list-packages` | — | All packages with metadata (`availableDocPages`, `hasSource`, category, exports, related, etc.) |
| `get-package` | `packageSlug` | Metadata for a single package |
| `get-docs` | `packageSlug`, `page?` | Package docs page (`index`, `api`, `usage`, `examples`) |
| `get-source` | `packageSlug` | Bundled `src/index.ts` text for a package |
| `search-packages` | `query` | Search package metadata and docs content with ranked matches |
| `list-components` | — | Buildit component tags from bundled metadata |
| `get-component` | `tagName` | Full Buildit component declaration by tag |

### Transports

- **Stdio (default)** for local MCP clients
- **Streamable HTTP** with `--port <number>` for remote agents

## Quick start

```sh
# standalone (stdio)
pnpm dlx @vielzeug/mcpit
# or
npx -y @vielzeug/mcpit

# standalone (HTTP)
pnpm dlx @vielzeug/mcpit --port 3100

# cli helpers
pnpm dlx @vielzeug/mcpit --help
pnpm dlx @vielzeug/mcpit --version
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
- For monorepo development only: `packages/mcpit/dist/cli.js` from `pnpm build`

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Buildit](/buildit/)
- [Validit](/validit/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
