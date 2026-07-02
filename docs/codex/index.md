---
title: Codex — MCP server for the Vielzeug ecosystem
description: MCP server exposing Vielzeug package metadata, docs pages, source, and Refine component metadata over stdio or HTTP.
package: codex
category: ai-tooling
keywords: [mcp, model-context-protocol, ai-agent, claude, copilot, stdio, http, docs]
related: [refine, spell]
exports:
  [
    createServer,
    createServerFromDisk,
    createRequestHandler,
    startHttpServer,
    loadData,
    packageMeta,
    validateBundledData,
    CodexError,
    ToolArgError,
    SCHEMA_VERSION,
    SearchHit,
    BundledData,
    BundledPackage,
    PackageMeta,
    DocPage,
    HttpServerHandle,
    CemAttribute,
    CemCssPart,
    CemCssProperty,
    CemDeclaration,
    CemEvent,
    CemMember,
    CemSlot,
    CemTypeRef,
  ]
environments: [node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="codex" />

## Why Codex?

AI agents working with Vielzeug need reliable, structured access to package docs and metadata. Fetching the live site is fragile, network-dependent, and returns raw HTML that must be parsed and cleaned per-agent.

```
// Before — each agent fetches and parses docs independently
fetch('https://vielzeug.dev/spell/api') → parse HTML → strip nav, ads, markup → hope it matches

// After — one MCP server, structured tool calls, snapshot-backed
{ "name": "get-docs", "arguments": { "packageSlug": "spell", "page": "api" } }
```

| Feature                   | `@vielzeug/codex`                                | Live docs fetch                            | Generic web search                         |
| ------------------------- | ------------------------------------------------ | ------------------------------------------ | ------------------------------------------ |
| Structured metadata       | <ore-icon name="check" size="16"></ore-icon>       | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Works offline             | <ore-icon name="check" size="16"></ore-icon>       | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Refine component CEM       | <ore-icon name="check" size="16"></ore-icon>       | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Ranked search             | <ore-icon name="check" size="16"></ore-icon>       | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| Stdio + HTTP transports   | <ore-icon name="check" size="16"></ore-icon>       | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| External runtime dep      | <ore-icon name="triangle-alert" size="16"></ore-icon> (MCP SDK) | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

<div class="decision-callout">

**Use `@vielzeug/codex` when** you are wiring an AI client (Claude Desktop, Copilot Chat, or a custom agent) to Vielzeug documentation and need reliable, offline-capable, structured access.

**Consider live docs or a web search when** you need content added to the site after the current snapshot was published.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/codex
```

```sh [npm]
npm install @vielzeug/codex
```

```sh [yarn]
yarn add @vielzeug/codex
```

:::

## Quick Start

Run over stdio — the default transport, compatible with Claude Desktop and Copilot Chat:

```sh
npx -y @vielzeug/codex
```

Run over HTTP for remote agents or multi-client setups:

```sh
npx -y @vielzeug/codex --port 3100
```

Wire it into your AI client — see the [Usage Guide](./usage.md) for client-specific config.

## Features

<div class="features-grid">

- Seven MCP tools: `list-packages`, `get-package`, `get-docs`, `get-source`, `search-packages`, `list-components`, `get-component`
- `search-packages` ranks hits by field weight: name (3.9) > category (3.5) > description (3.1) > keywords (2.5) > exports (2.2) > related (2.0) > docs (1.0) > source (0.9)
- Multi-word AND search — all terms must match within the same field; hyphenated names normalised automatically
- Bundled snapshot data — runs without a network connection or local Vielzeug checkout
- Stdio transport (default) for local clients; Streamable HTTP with `--port <n>` for remote agents; legacy SSE at `GET /sse` for older clients
- Health endpoint at `GET /health` in HTTP mode
- Fail-fast startup: missing or malformed data bundle aborts with an actionable error and regen hint
- Programmatic API: `createServer`, `createServerFromDisk`, `startHttpServer`, `loadData`, `validateBundledData`

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Refine](/refine/) — source of the bundled Refine component CEM metadata exposed via `list-components` and `get-component`
- [Spell](/spell/) — example of a well-documented package discoverable via `search-packages` and `get-docs`

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
