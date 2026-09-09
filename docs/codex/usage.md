---
title: Codex — Usage Guide
description: Install, connect, develop, and debug the Vielzeug MCP server.
---

[[toc]]

## Basic Usage

Run local stdio server:

```sh
npx -y @vielzeug/codex
```

Use shipped `mcp-setup.json` for machine-readable generic configuration. Client-specific configuration must use its documented MCP format.

## HTTP Mode

HTTP uses Streamable HTTP and binds loopback only:

```sh
npx -y @vielzeug/codex --port=3100
curl http://127.0.0.1:3100/health
```

Response includes snapshot version. Runtime bind validation and Host/Origin allowlists restrict access to localhost; no remote host mode exists. Programmatic `configureServer` hooks run once per MCP request server, not at host startup. Dispose the host asynchronously and observe `disposed` or `disposalSignal` when coordinating shutdown.

## Local Development

Requires Node 22+ and root setup:

```sh
pnpm setup
cd packages/codex
pnpm test:unit
pnpm test:integration
pnpm dev
```

`test:unit` uses fixtures only. `test:integration` regenerates a current snapshot then checks real monorepo inputs.

`pnpm dev` watches documentation and package inputs, atomically publishes snapshots, then restarts server when snapshot changes.

## Debugging

```sh
pnpm dev
node src/cli.ts --port=3100 --debug
curl http://127.0.0.1:3100/health
```

`--debug` logs tool durations and expected catalog errors to stderr. Build `@vielzeug/refine` before generating snapshot when component metadata changes.

## Programmatic Usage

```ts
import { SnapshotCatalog, StdioServerTransport, createMcpServer, loadSnapshot } from '@vielzeug/codex';

const snapshot = loadSnapshot();
const catalog = new SnapshotCatalog(snapshot);
await createMcpServer(catalog, { version: snapshot.manifest.version }).connect(new StdioServerTransport());
```

To include Refine component tools, upgrade the server with the `@vielzeug/codex/refine` subpath:

```ts
import { StdioServerTransport, createMcpServer, loadSnapshot } from '@vielzeug/codex';
import { SnapshotRefineCatalog, registerRefineTools } from '@vielzeug/codex/refine';

const snapshot = loadSnapshot();
const catalog = new SnapshotRefineCatalog(snapshot);
const server = createMcpServer(catalog, { version: snapshot.manifest.version });
registerRefineTools(server, catalog);
await server.connect(new StdioServerTransport());
```

## Best Practices

- Use `search-packages` for capability discovery before loading broad source.
- Use `get-type-signature` before loading full source.
- Published package snapshots are static directories; local dev snapshots are immutable generations selected by `.dev/current.json`.
- Import `validateSnapshot()` from `/advanced` for artifact verification; normal startup keeps package chunks lazy.
- Treat `configureServer` as a per-request factory hook and avoid process-global side effects.
- Keep HTTP local. Use stdio for normal client integration.
- Run `pnpm test:unit` before `pnpm test:integration`.
