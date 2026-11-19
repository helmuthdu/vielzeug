---
title: Codex API
description: MCP server factory, local HTTP host, and error APIs.
---

[[toc]]

## Package Entry Point

`@vielzeug/codex` is an executable tool first: the CLI and the MCP server are the product. The
library surface is intentionally minimal — the server factory, the HTTP host, and the error type,
all from the single root entry point. The catalog, the snapshot loader, and the tool tables are
internal and may change without notice (`verify-exports.mjs` fails the build if they leak out).

## API Overview

| Symbol              | Purpose                                     | Execution mode | Common gotcha                            |
| ------------------- | ------------------------------------------- | -------------- | ---------------------------------------- |
| `createCodexServer` | MCP server factory over a snapshot          | Sync           | Loads the bundled snapshot by default    |
| `startHttpHost`     | Loopback Streamable HTTP host               | Async          | HTTP remains local-only                  |
| `CodexError`        | Base class for every codex-originated error | —              | Snapshot and host failures both subclass |

## `createCodexServer`

```ts
createCodexServer(options?: {
  debug?: boolean;
  snapshot?: string | Snapshot;
}): Server;
```

Creates a connected-ready MCP `Server` (from `@modelcontextprotocol/server`) for the given
snapshot. `snapshot` accepts a path to a `snapshot.json` (or a directory containing one) or an
already-loaded `Snapshot` object; it defaults to the snapshot bundled in the package. Pass the
loaded object when creating a server per request — parsing the snapshot is the expensive step and
the CLI loads it exactly once for this reason.

The server registers the six generic tools plus the four `refine-*` tools when the snapshot
actually carries Refine components; tools that could only answer "unavailable" are never offered.
The snapshot version travels in the server `instructions`, so a client can compare the version its
answers describe against the `@vielzeug/*` versions installed in its project without a tool call.

```ts
import { createCodexServer } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

const server = createCodexServer();
await server.connect(new StdioServerTransport());
```

## `startHttpHost`

```ts
startHttpHost(options: {
  createServer: () => Server;
  host?: '127.0.0.1' | '::1';
  port: number;
  version: string;
}): Promise<HttpHost>;
```

Starts Streamable HTTP on `127.0.0.1` by default. Runtime validation accepts only `127.0.0.1` or
`::1`; every request must also pass localhost Host and Origin checks. `createServer` must return a
fresh, unconnected server with its request handlers registered — one server per request keeps the
stateless transport honest. Parsing the snapshot is the expensive step, so load it once (read the
JSON file yourself, or hold one `Snapshot` object) and hand the same object to every server, as
the CLI does:

```ts
import { readFileSync } from 'node:fs';

const snapshot = JSON.parse(readFileSync('data/snapshot.json', 'utf8'));
const host = await startHttpHost({
  createServer: () => createCodexServer({ snapshot }),
  port: 3939,
  version,
});
```

`HttpHost` exposes `host`, `port`, `disposed`, `dispose()`, and `Symbol.asyncDispose`.

## Errors

`CodexError` is the base class for every codex-originated error: a malformed or version-mismatched
snapshot, or an HTTP host failure. Catch it with `instanceof CodexError`. Expected tool failures
(bad arguments, unknown package) never throw to the transport — the tool layer maps them to MCP
`{ isError: true }` results internally.

## Snapshot contract

The one generated artifact is `data/snapshot.json` (gitignored in the repo, published in the npm
package). Its shape is declared in `src/types.ts` and enforced by the writer at generate time, so
the runtime reads it without re-validating. A snapshot carries:

- `version` — the codex version it was generated from; the loader refuses a mismatch.
- `packages` — per package: metadata, docs pages as markdown keyed by page path, heading sections
  with offsets into the stored page text, REPL examples, and checker-resolved exports with their
  real declaration text and JSDoc. This includes type aliases and interfaces, including
  type-only re-exports resolved to their original declarations.
- `components` — Refine custom elements projected from the Custom Elements Manifest.
- `tokens` — theme custom properties from `theme.css` with values and notes.

`llms.txt` and `llms-full.txt` are **not** part of the snapshot: the VitePress docs build generates
them from `docs/` directly.
