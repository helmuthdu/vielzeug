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

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/mcp`  ·  **Category:** AI Tooling

**Key exports:** `createServer`

**When to use:** You want AI clients (Claude Desktop, Copilot Chat, remote agents) to discover and query Vielzeug package metadata, docs, and Block component declarations through a standard MCP tool interface.

**Related:** [Block](/block/) · [Sieve](/sieve/)

</details>

`@vielzeug/mcp` is the Model Context Protocol server for the Vielzeug ecosystem — run it over stdio or HTTP to expose package metadata, documentation, source entrypoints, and Block component metadata to AI assistants.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/mcp
```

```sh [npm]
npm install @vielzeug/mcp
```

```sh [yarn]
yarn add @vielzeug/mcp
```

:::

## Quick Start

```sh
# Run over stdio (Claude Desktop, Copilot Chat)
npx -y @vielzeug/mcp

# Run over HTTP (remote agents)
npx -y @vielzeug/mcp --port 3100

# CLI helpers
npx -y @vielzeug/mcp --help
npx -y @vielzeug/mcp --version
```

Then wire it into your AI client — see the [Usage Guide](./usage.md).

## Why Mcp?

AI agents working with Vielzeug need reliable, structured access to package metadata and documentation. A custom fetch integration or web scraper breaks with every docs update and returns inconsistent data shapes.

```ts
// Before — fetch and parse docs manually in each agent
const res = await fetch('https://vielzeug.dev/sieve/api');
const html = await res.text();
// parse, clean, truncate — fragile, network-dependent, inconsistent

// After — structured MCP tool call, always in sync with the published snapshot
{ "name": "get-docs", "arguments": { "packageSlug": "sieve", "page": "api" } }
```

| Feature | `@vielzeug/mcp` | Custom fetch | Generic web search |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="mcp" type="size" /> | — | — |
| Zero external deps | ❌ (MCP SDK) | ✅ | ✅ |
| Structured metadata | ✅ | ❌ | ❌ |
| Block component CEM | ✅ | ❌ | ❌ |
| Offline / snapshot-backed | ✅ | ❌ | ❌ |
| Stdio + HTTP transports | ✅ | ❌ | ❌ |

**Use `@vielzeug/mcp` when** you are building or configuring an AI agent that needs reliable, offline access to Vielzeug documentation and component metadata.

**Consider a web search when** you need content from the live docs site that post-dates the current published snapshot.

## What it exposes

### Tools

| Tool | Input | Description |
| --- | --- | --- |
| `list-packages` | `packageSlug?` | All packages with metadata; pass `packageSlug` to filter to a single-item result |
| `get-docs` | `packageSlug`, `page?` | Package docs page (`index`, `api`, `usage`, `examples`); defaults to `index` |
| `get-source` | `packageSlug` | Bundled `src/index.ts` text for a package |
| `search-packages` | `query` | Search package metadata and docs with ranked matches |
| `list-components` | — | Block component tags from bundled CEM metadata |
| `get-component` | `tagName` | Full Block component CEM declaration by tag |

### Resources

| URI pattern | MIME type | Content |
| --- | --- | --- |
| `vielzeug://docs/<slug>/<page>` | `text/markdown` | Documentation page |
| `vielzeug://source/<slug>` | `text/x-typescript` | `src/index.ts` source |

### Transports

- **Stdio (default)** for local MCP clients
- **Streamable HTTP** with `--port <number>` for remote agents

## Features

- `list-packages` accepts optional `packageSlug` to retrieve a single package as a one-item array
- `search-packages` returns ranked hits with `matchedIn` (array), `matchedPages`, and `score`
- MCP Resources exposed at `vielzeug://docs/<slug>/<page>` and `vielzeug://source/<slug>`
- Bundled snapshot data — runs without a local Vielzeug checkout
- Fail-fast startup: missing or malformed data aborts immediately with an actionable error message
- Health endpoint at `/health` in HTTP mode

## Compatibility

| Environment | Support |
| --- | --- |
| Node.js 22+ | ✅ |
| Claude Desktop (stdio) | ✅ |
| GitHub Copilot Chat (stdio) | ✅ |
| Remote agents (HTTP) | ✅ |
| Browser | ❌ |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Block](/block/) — source of the bundled Block component CEM metadata
- [Sieve](/sieve/) — example of a well-documented package discoverable via MCP

<!-- markdownlint-enable MD025 MD033 MD060 -->
