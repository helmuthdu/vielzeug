---
title: Codex API
description: Snapshot, catalog, MCP server, and local HTTP host APIs.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `loadSnapshot` | Read validated snapshot metadata | Sync | Content chunks load lazily |
| `SnapshotCatalog` | Query package corpus | Sync | Construct from loaded snapshot |
| `createMcpServer` | MCP adapter factory | Sync | Requires catalog and version |
| `startHttpHost` | Loopback Streamable HTTP host | Async | HTTP remains local-only |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/codex` | Snapshot, catalog, MCP, and HTTP APIs |

## Snapshot

### `loadSnapshot`

```ts
loadSnapshot(snapshotDirectory?: string): LoadedSnapshot;
```

Loads catalog/search metadata only. Use `validateSnapshot()` during generation, integration tests, or explicit artifact verification; package chunks stay lazy at runtime.

### `SnapshotCatalog`

```ts
new SnapshotCatalog(snapshot: LoadedSnapshot)
```

Provides package lookup, docs/source/example/signature access, deterministic search, and Refine component lookup.

## MCP

### `createMcpServer`

```ts
createMcpServer(catalog: Catalog, options: { version: string; debug?: boolean }): Server;
```

Registers MCP tools as an adapter over `Catalog`.

## HTTP

### `startHttpHost`

```ts
startHttpHost(options: HttpHostOptions): Promise<HttpHost>;
```

Starts Streamable HTTP on `127.0.0.1` by default. Host accepts only loopback addresses.

## Types

```ts
interface SnapshotPointer {
  directory: 'snapshots/<immutable-id>';
}

// Dev snapshots use SnapshotPointer; published snapshots are static directories.
interface SnapshotManifest {
  schemaVersion: 1;
  catalog: 'catalog.json';
  search: 'search.json';
  contentDirectory: 'packages';
}
```

## Errors

`CodexError` signals malformed snapshots or host failures. `CatalogError` adds `INVALID_ARG`, `NOT_FOUND`, or `UNAVAILABLE` for expected tool failures.
