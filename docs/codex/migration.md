---
title: Codex 2.0 Migration
---

# Codex 2.0 Migration

Codex 2.0 redesigns data access around validated chunked snapshots, catalog APIs, and local-only Streamable HTTP.

## Load validated snapshots

Load and validate snapshot data through the 2.0 snapshot APIs before serving or querying it. Use `loadSnapshot` and `validateSnapshot` for snapshot boundaries; use the parsing helpers for individual snapshot parts.

## Query through catalogs

Replace direct document-data access with `SnapshotCatalog` and the `Catalog` API. Catalog methods provide the supported package, content, and search access paths.

## Use local-only HTTP hosting

Move Streamable HTTP integrations to `startHttpHost`. Configure it for loopback use only; do not expose Codex's HTTP host on public interfaces.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for 2.0 snapshot, catalog, server, and HTTP contracts.
