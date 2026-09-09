/**
 * `@vielzeug/codex` — supported public contract.
 *
 * Exposes the generic catalog, snapshot loader, errors, and server hosts. Snapshot
 * parser internals live behind `@vielzeug/codex/advanced`; Refine catalog types and
 * tools live behind `@vielzeug/codex/refine`.
 */
export { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
export { type Catalog, CatalogError, type SearchHit, SnapshotCatalog } from './catalog.js';
export { CodexError } from './errors.js';
export { type HttpHost, type HttpHostOptions, startHttpHost } from './http.js';
export { createMcpServer } from './server.js';
export { type LoadedSnapshot, loadSnapshot } from './snapshot.js';
export type {
  DocPage,
  Example,
  PackageContent,
  PackageMeta,
  SnapshotManifest,
} from './types.js';
