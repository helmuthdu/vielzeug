---
title: Codex — Vielzeug MCP Server
description: Give your AI assistant native access to Vielzeug docs, package metadata, and Sigil component declarations — no web scraping, no network dependency.
package: codex
category: ai-tooling
keywords: [mcp, model-context-protocol, ai-agent, claude, copilot, cursor, stdio, http, docs]
related: [sigil, spell]
exports:
  [
    createServer,
    createServerFromDisk,
    loadData,
    packageMeta,
    validateBundledData,
    HttpServerHandle,
    CemDeclaration,
    CemAttribute,
    CemCssPart,
    CemCssProperty,
    CemEvent,
    CemMember,
    CemSlot,
    CemTypeRef,
    SearchHit,
    BundledData,
    BundledPackage,
    PackageMeta,
    DocPage,
  ]
environments: [node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="codex" />

## What is Codex?

Codex is a **[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server** for the Vielzeug ecosystem. Run it once — your AI assistant (Claude, Copilot, Cursor, or any MCP-compatible client) gains structured, offline access to:

- **Package metadata** — descriptions, exports, keywords, and related packages for all 24 Vielzeug packages
- **Documentation pages** — full Markdown content for every `index`, `api`, `usage`, and `examples` page
- **Source signatures** — bundled `src/index.ts` for precise type information
- **Sigil component CEM** — attributes, slots, events, CSS parts, and members for every `sg-*` component

The data is bundled into the package at publish time — no network requests, no scraping, no breakage when the website changes.

## Quick Setup

No installation required. Run with `npx`:

```sh
npx -y @vielzeug/codex
```

Then add it to your AI client. Pick your client below, or see the full [Setup Guide](./usage.md).

::: code-group

```json [Claude Desktop]
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "vielzeug": {
      "command": "npx",
      "args": ["-y", "@vielzeug/codex"]
    }
  }
}
```

```json [GitHub Copilot Chat]
// .vscode/mcp.json
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

```json [Cursor]
// ~/.cursor/mcp.json  (or .cursor/mcp.json in your project)
{
  "mcpServers": {
    "vielzeug": {
      "command": "npx",
      "args": ["-y", "@vielzeug/codex"]
    }
  }
}
```

:::

## Available Tools

Once connected, your AI assistant can call these tools:

| Tool              | Input                  | Returns                                                           |
| ----------------- | ---------------------- | ----------------------------------------------------------------- |
| `list-packages`   | —                      | All packages with metadata                                        |
| `get-package`     | `packageSlug`          | Single package metadata                                           |
| `search-packages` | `query`                | Ranked matches across metadata, docs, exports, and source         |
| `get-docs`        | `packageSlug`, `page?` | Docs page (`index`, `api`, `usage`, `examples`); default `index`  |
| `get-source`      | `packageSlug`          | Bundled `src/index.ts` — exact exported types and signatures      |
| `list-components` | —                      | All Sigil component tag names with attribute summary              |
| `get-component`   | `tagName`              | Full CEM declaration — attributes, slots, events, CSS parts       |

A typical session looks like:

```
search-packages { query: "form validation" }     → find the right package
get-docs { packageSlug: "forge", page: "api" }   → read the API reference
get-source { packageSlug: "forge" }              → inspect exact types
```

## HTTP Mode

For remote agents or CI pipelines, run with `--port`:

```sh
npx -y @vielzeug/codex --port 3100
# MCP endpoint: http://localhost:3100/
# Health check:  http://localhost:3100/health
```

::: warning Local only
HTTP mode binds with `Access-Control-Allow-Origin: *` and has no authentication. Never expose the port on a public interface.
:::

## Programmatic API

Codex also exports a Node.js API for embedding the server in a larger process:

```ts
import { createServerFromDisk } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

await createServerFromDisk().connect(new StdioServerTransport());
```

See the [API Reference](./api.md) for `createServer`, `loadData`, `validateBundledData`, and all exported types.

## Documentation

- [Setup Guide](./usage.md) — client configs, HTTP mode, security, monorepo dev
- [API Reference](./api.md) — tools, resources, programmatic API, all types
- [Examples](./examples.md) — common tool-call patterns

<!-- markdownlint-enable MD025 MD033 MD060 -->
