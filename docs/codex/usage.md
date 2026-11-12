---
title: 'Codex: Usage Guide'
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

Response includes snapshot version. Runtime bind validation and Host/Origin allowlists restrict access to localhost; no remote host mode exists. Programmatic HTTP hosting takes a `createServer` factory that returns a fresh, unconnected server with its request handlers registered. Dispose the host asynchronously and observe `disposed` when coordinating shutdown.

## Agent Skill

Codex ships a `vielzeug` agent skill: a `SKILL.md` that tells an AI agent working in _your_ project to discover packages through the MCP tools instead of guessing, to use the owning `@vielzeug/*` package instead of hand-rolling, and to build UI from Refine components, tokens, and theme whenever `@vielzeug/refine` is installed. Install it into the project:

```sh
npx -y @vielzeug/codex skills install
npx -y @vielzeug/codex skills install --target=.claude/skills
npx -y @vielzeug/codex skills install --force   # overwrite an existing copy
```

Without `--target`, the first existing directory among `.agents/skills`, `.github/skills`, and `.claude/skills` is used; when none exists, `.agents/skills` is created. The command refuses to overwrite an installed skill unless `--force` is passed. Rerun after upgrading codex to pick up the current package list, which is generated from the published manifests. The skill pairs with the MCP server: its lookups (`get-docs`, `refine-get-component`, `refine-validate-usage`, …) assume codex is connected, and it documents `node_modules` fallbacks for when it is not.

## Local Development

Requires Node 22+ and root setup:

```sh
bun install
cd packages/codex
bun run test:unit
bun run test:integration
bun run dev
```

`test:unit` uses fixtures only. `test:integration` regenerates a current snapshot then checks real monorepo inputs.

`bun run dev` watches documentation and package inputs, regenerates `.dev/` through a staging swap, and restarts the server against it.

## Debugging

```sh
bun run dev
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

`createMcpServer` also registers the `refine-*` component tools whenever the loaded snapshot carries Refine metadata; there is nothing to opt into.

## Best Practices

- Use `search-packages` for capability discovery before loading broad source.
- Use `get-type-signature` before loading full source.
- Every snapshot is one flat directory (manifest, catalog, content chunks, optional Refine metadata); `--snapshot` points at it directly.
- Pass `validateContents: true` to `loadSnapshot()` for artifact verification; normal startup keeps package chunks lazy.
- Return a fresh configured server from `startHttpHost`'s `createServer` factory.
- Keep HTTP local. Use stdio for normal client integration.
- Run `bun run test:unit` before `bun run test:integration`.
