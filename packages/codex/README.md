# @vielzeug/codex

> MCP server for the Vielzeug ecosystem. Run over stdio or HTTP to expose package metadata, docs, source entrypoints, runnable REPL examples, and Refine component metadata.

[![npm version](https://img.shields.io/npm/v/@vielzeug/codex)](https://www.npmjs.com/package/@vielzeug/codex) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/codex` &nbsp;·&nbsp; **Category:** AI Tooling

**Key exports:** `createServer`, `createServerFromDisk`, `loadData`, `packageMeta`, `validateBundledData`, `startHttpServer`

**When to use:** You want AI clients to query Vielzeug docs and package metadata through a compact MCP tool set.

**Related:** [@vielzeug/refine](https://vielzeug.dev/refine/) · [@vielzeug/spell](https://vielzeug.dev/spell/)

</details>

`@vielzeug/codex` ships with bundled snapshot data, so it runs without a local Vielzeug checkout.

## Installation

```sh
pnpm add @vielzeug/codex
npm install @vielzeug/codex
yarn add @vielzeug/codex
```

## Quick Start

Run over stdio (default):

```sh
npx -y @vielzeug/codex
```

Run over HTTP:

```sh
npx -y @vielzeug/codex --port 3100
```

CLI helpers:

```sh
npx -y @vielzeug/codex --help
npx -y @vielzeug/codex --version
```

## Tools

Two tiers: generic tools work for every bundled package; `refine-*` tools expose
[@vielzeug/refine](https://vielzeug.dev/refine/)'s structured component metadata (Custom
Elements Manifest data generated from refine's real build output, never hand-duplicated).
There's no ore/spell/sandbox-specific tooling — `get-docs`, `get-source`, and
`get-type-signature` already cover those packages accurately; see
[docs/ore/api.md](https://vielzeug.dev/ore/api), [docs/spell/api.md](https://vielzeug.dev/spell/api),
and [docs/sandbox/api.md](https://vielzeug.dev/sandbox/api).

These tables are generated from the tool registry (`pnpm gen:tool-docs`) — never hand-edit them.

<!-- TOOLS:GENERIC:START -->
| Tool | Input | Description |
| --- | --- | --- |
| `list-packages` | — | List all vielzeug packages with metadata (version, description, category, keywords, exports, availableDocPages, exampleIds, hasSource). |
| `get-package` | `packageSlug` | Get metadata for a single vielzeug package by slug. |
| `get-docs` | `packageSlug`, `page?` | Read a documentation page for a vielzeug package. |
| `get-source` | `packageSlug` | Read the full src/index.ts source of a vielzeug package. |
| `list-examples` | `packageSlug` | List runnable REPL code examples for a vielzeug package. |
| `get-example` | `exampleId`, `packageSlug` | Read the full runnable source code of a single REPL example for a vielzeug package. |
| `search-packages` | `query` | Search vielzeug packages by keyword across name, description, category, keywords, exports, related, docs, REPL examples, and source. |
| `get-type-signature` | `slug`, `symbol` | Look up the exported TypeScript declaration for a named symbol from a @vielzeug package's bundled src/index.ts (extracted and indexed at build time, not parsed per-request). |
<!-- TOOLS:GENERIC:END -->

<!-- TOOLS:REFINE:START -->
| Tool | Input | Description |
| --- | --- | --- |
| `refine-list-components` | — | List all @vielzeug/refine web component tags from bundled Custom Elements Manifest (CEM) metadata. |
| `refine-get-component` | `tagName` | Get the full Custom Elements Manifest (CEM) declaration for a single @vielzeug/refine component by its HTML tag name (e.g. "ore-button"). |
| `refine-generate-template` | `scenario?`, `tagName` | Generate a ready-to-use HTML template for a @vielzeug/refine component. |
| `refine-get-tokens` | `filter?` | List all CSS custom properties (design tokens) exposed by @vielzeug/refine components. |
| `refine-validate-usage` | `html`, `tagName` | Validate AI-generated HTML against a @vielzeug/refine component spec. |
<!-- TOOLS:REFINE:END -->

### Error results

A failed tool call returns `isError: true` with a single text content block containing
`{"code": "...", "message": "..."}` — `code` is one of `INVALID_ARG` (bad or missing argument),
`NOT_FOUND` (unknown slug/tag/symbol/example), or `UNAVAILABLE` (data not bundled, e.g. refine
CEM metadata when refine wasn't built). Branch on `code` instead of matching `message` text.

## HTTP mode

- MCP endpoint: `http://localhost:<port>/`
- Health check: `http://localhost:<port>/health`
- No authentication and permissive CORS (`Access-Control-Allow-Origin: *`) — any origin reachable from the machine running the server can call every tool. All bundled tools are read-only and side-effect-free (no filesystem writes, no shell/network access beyond serving pre-bundled data), so this is a deliberate trade-off for local developer tooling (editor extensions, browser-based MCP inspectors) rather than a public-facing deployment mode. Do not expose `--port` beyond `localhost` or a trusted network.

## Debugging

Environment variables for local development (not needed for normal use):

| Variable | Effect |
| --- | --- |
| `CODEX_DEBUG=1` | Logs every tool call (name, args, timing, and errors) to stderr. |
| `CODEX_PORT=<port>` | Port used by `pnpm dev` (default `3001`). |
| `CODEX_FORCE_REGEN=1` | Skips the incremental cache in `prepare:data` — full regeneration. |

Local dev loop: `pnpm dev` generates bundled data once, then runs the CLI directly against
`src/` (via `node --watch`, no build step) alongside a `docs/` watcher that regenerates data on
change.

## Programmatic API

`createServerFromDisk()` is the simplest entry point — one call, no arguments:

```ts
import { createServerFromDisk } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

await createServerFromDisk().connect(new StdioServerTransport());
```

For explicit control over data loading:

```ts
import { createServer, loadData } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

await createServer(loadData()).connect(new StdioServerTransport());
```

## Documentation

- [Overview](https://vielzeug.dev/codex/)
- [Usage Guide](https://vielzeug.dev/codex/usage)
- [API Reference](https://vielzeug.dev/codex/api)
- [Examples](https://vielzeug.dev/codex/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
