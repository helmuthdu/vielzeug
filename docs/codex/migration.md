---
title: Codex Migration
---

# Codex Migration

## Breaking Changes Since 26.11.11

One entry point, one catalog, one directory layout.

`@vielzeug/codex/refine` is removed and merged into the root entry. `SnapshotCatalog` always exposes `getComponent()` and `listComponents()` (empty without Refine metadata), and `createMcpServer()` registers the `refine-*` tools exactly when the snapshot carries component metadata:

```ts
import { SnapshotCatalog, StdioServerTransport, createMcpServer, loadSnapshot } from '@vielzeug/codex';

const snapshot = loadSnapshot();
const server = createMcpServer(new SnapshotCatalog(snapshot), { version: snapshot.manifest.version });
await server.connect(new StdioServerTransport());
```

`createMcpServerWithRefine`, `SnapshotRefineCatalog`, and the `RefineCatalog` type are gone; the CEM types are exported from the root entry. MCP behavior is unchanged for CLI and HTTP clients.

`HttpHost.disposalSignal` is removed. Observe `disposed` or await `dispose()`/`Symbol.asyncDispose`.

The snapshot format is now schema version 2 and always one flat directory passed directly to `loadSnapshot()` or `--snapshot`:

- `manifest.json` carries `{ schemaVersion, version }` only; layout filenames are loader constants.
- `search.json` is gone. `search-packages` reads the same lazily cached content chunks as the content getters, so the bundle no longer ships a second normalized copy of every doc page.
- The `current.json` pointer and `.dev/snapshots` generations are gone; local dev republishes `.dev/` in place between server restarts.

`loadSnapshot()`, `validateSnapshot()`, and every MCP tool keep their behavior.

## Codex 26.11: Catalog and server construction

> [!NOTE]
> The 26.11 server-construction layout was superseded by the merge into the single root entry.
> The steps below describe the 26.11 layout only.

`Catalog.getContent()` and the root `PackageContent` type are removed. Read package details through `getDocs()`, `getSource()`, `getExample()`, and `getTypeSignature()`. Catalog metadata and Refine component declarations now use readonly TypeScript types.

Replace the two-step Refine setup with `createMcpServerWithRefine()`. The new name makes clear that the server includes generic package tools as well as Refine tools:

```ts
import { loadSnapshot } from '@vielzeug/codex';
import { createMcpServerWithRefine, SnapshotRefineCatalog } from '@vielzeug/codex/refine';

const snapshot = loadSnapshot();
const catalog = new SnapshotRefineCatalog(snapshot);
const server = createMcpServerWithRefine(catalog, { version: snapshot.manifest.version });
```

`startHttpHost()` now owns only the HTTP transport and accepts a `createServer` factory. The factory must return a fresh, unconnected server with its request handlers registered for each request:

```ts
import { loadSnapshot, startHttpHost } from '@vielzeug/codex';
import { createMcpServerWithRefine, SnapshotRefineCatalog } from '@vielzeug/codex/refine';

const snapshot = loadSnapshot();
const catalog = new SnapshotRefineCatalog(snapshot);
await startHttpHost({
  createServer: () => createMcpServerWithRefine(catalog, { version: snapshot.manifest.version }),
  port: 3100,
  version: snapshot.manifest.version,
});
```

## Codex 26.10

The `@vielzeug/codex/advanced` subpath is removed. It had no consumers outside the package's own build tooling, which imports the parsers relatively. Snapshot parsing stays internal; use `loadSnapshot()` (with `validateContents: true` for full artifact verification) from the root entry.

## Codex 3.0

Codex 3.0 separates generic package tools, snapshot internals, and Refine component tools into explicit typed entry points. It also hardens custom snapshot validation and loopback HTTP hosting.

## Opt into Refine tools

`createMcpServer()` now registers only generic package tools. The CLI still includes Refine tools by default. Programmatic servers add them explicitly:

```ts
import { createMcpServer, loadSnapshot } from '@vielzeug/codex';
import { SnapshotRefineCatalog, registerRefineTools } from '@vielzeug/codex/refine';

const snapshot = loadSnapshot();
const catalog = new SnapshotRefineCatalog(snapshot);
const server = createMcpServer(catalog, { version: snapshot.manifest.version });
registerRefineTools(server, catalog);
```

The generic `Catalog` and `SnapshotCatalog` no longer expose component methods. Refine integrations use `RefineCatalog` and `SnapshotRefineCatalog` from `@vielzeug/codex/refine`.

## Move snapshot internals to `/advanced`

> [!NOTE]
> The `/advanced` subpath was removed in Codex 26.10. The historical steps below describe the 3.0 layout only.

The supported root keeps `loadSnapshot()` and `LoadedSnapshot`. Import lower-level parsers, full validation, raw snapshot types, and schema constants from `@vielzeug/codex/advanced`:

```ts
import {
  DOC_PAGES,
  SNAPSHOT_SCHEMA_VERSION,
  parseContent,
  parseManifest,
  validateSnapshot,
} from '@vielzeug/codex/advanced';
```

Moved exports include `loadSnapshotDirectory`, `parseCatalog`, `parseContent`, `parseManifest`, `parsePointer`, `parseRefine`, `parseSearch`, `validateSnapshot`, `CatalogFile`, `SearchRecord`, `SnapshotPointer`, `DOC_PAGES`, and `SNAPSHOT_SCHEMA_VERSION`.

CEM declarations and `RefineCatalog` are exported from `@vielzeug/codex/refine`.

## Use generated declarations

All three entry points now publish TypeScript declarations and explicit `types` export conditions. Codex remains ESM-only.

The root also exports `StdioServerTransport`, so programmatic stdio use no longer requires importing Codex's MCP dependency directly:

```ts
import { SnapshotCatalog, StdioServerTransport, createMcpServer, loadSnapshot } from '@vielzeug/codex';
```

## Secure HTTP extensions

`startHttpHost()` rejects non-loopback bind addresses and validates Host and Origin headers against localhost allowlists. The old `configureServer` hook was replaced in Codex 26.11 by a `createServer` factory that returns an unconnected server with its handlers registered for each request.

`HttpHost` now exposes `disposed` and `disposalSignal` alongside async disposal.

## Codex 2.0 Migration

Codex 2.0 introduced validated chunked snapshots, catalog-based access, and local Streamable HTTP hosting.

- Replace direct document-data access with `SnapshotCatalog` and `Catalog` methods.
- Use `loadSnapshot()` for normal startup.
- Keep `validateSnapshot()` for generation, integration tests, and artifact verification.
- Use `startHttpHost()` only for loopback HTTP access.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current contracts.
