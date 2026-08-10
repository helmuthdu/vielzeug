# @vielzeug/codex

MCP server for Vielzeug package metadata, documentation, public source, REPL examples, and Refine component data.

## Install and run

```sh
npx -y @vielzeug/codex
npx -y @vielzeug/codex --port=3100
```

Stdio is default. HTTP uses Streamable HTTP on `127.0.0.1`; health endpoint: `http://127.0.0.1:3100/health`.

`mcp-setup.json` ships a machine-readable generic stdio/HTTP setup manifest:

```json
{
  "command": "npx",
  "args": ["-y", "@vielzeug/codex"]
}
```

## Local development

Node 22+ and root workspace setup required:

```sh
pnpm setup
cd packages/codex
pnpm test:unit
pnpm test:integration
pnpm dev
```

`pnpm dev` regenerates an atomic chunked snapshot whenever docs or package inputs change. Use `--debug` to log tool timings and expected failures.

## Programmatic API

```ts
import { SnapshotCatalog, createMcpServer, loadSnapshot } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

const snapshot = loadSnapshot();
const catalog = new SnapshotCatalog(snapshot);
await createMcpServer(catalog, { version: snapshot.manifest.version }).connect(new StdioServerTransport());
```

## Tools

<!-- TOOLS:GENERIC:START -->
| Tool | Input | Description |
| --- | --- | --- |
| `list-packages` | — | List every Vielzeug package. |
| `get-package` | `packageSlug` | Read metadata for one package. |
| `get-docs` | `packageSlug`, `page?` | Read one documentation page as Markdown. |
| `get-source` | `packageSlug` | Read bundled public source for one package. |
| `list-examples` | `packageSlug` | List runnable REPL examples for one package. |
| `get-example` | `exampleId`, `packageSlug` | Read one runnable REPL example. |
| `search-packages` | `query` | Search package metadata, docs, examples, and source. |
| `get-type-signature` | `slug`, `symbol` | Read one exported TypeScript declaration. |
<!-- TOOLS:GENERIC:END -->

<!-- TOOLS:REFINE:START -->
| Tool | Input | Description |
| --- | --- | --- |
| `refine-list-components` | — | List bundled Refine web components. |
| `refine-get-component` | `tagName` | Read one Refine component declaration. |
| `refine-generate-template` | `scenario?`, `tagName` | Generate a minimal Refine component HTML template. |
| `refine-get-tokens` | `filter?` | List bundled Refine CSS custom properties. |
| `refine-validate-usage` | `html`, `tagName` | Validate unknown attributes in one Refine component HTML fragment. |
<!-- TOOLS:REFINE:END -->

## Snapshot layout

Published `data/` contains one static snapshot: `manifest.json`, lightweight `catalog.json` and `search.json`, optional `refine.json`, and lazy package chunks under `packages/`. Local `pnpm dev` snapshots live under ignored `.dev/` and use `current.json` to select an immutable generation. Pass `--snapshot=<directory>` to load either form.

## Documentation

- https://vielzeug.dev/codex/
- https://vielzeug.dev/codex/usage
- https://vielzeug.dev/codex/api
