---
title: Codex Migration
---

# Codex 3.0 Migration

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

`startHttpHost()` rejects non-loopback bind addresses and validates Host and Origin headers against localhost allowlists. `configureServer` runs once for each lazily created request server; it does not run during host startup.

`HttpHost` now exposes `disposed` and `disposalSignal` alongside async disposal.

## Codex 2.0 Migration

Codex 2.0 introduced validated chunked snapshots, catalog-based access, and local Streamable HTTP hosting.

- Replace direct document-data access with `SnapshotCatalog` and `Catalog` methods.
- Use `loadSnapshot()` for normal startup.
- Keep `validateSnapshot()` for generation, integration tests, and artifact verification.
- Use `startHttpHost()` only for loopback HTTP access.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current contracts.
