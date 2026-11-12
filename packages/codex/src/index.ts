/**
 * `@vielzeug/codex`: supported public contract.
 *
 * Exposes the catalog (package docs plus bundled Refine component metadata), the snapshot
 * loader, errors, the MCP server factory, and the loopback HTTP host.
 */

export { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
export { type Catalog, CatalogError, type SearchHit, SnapshotCatalog } from './catalog.js';
export { CodexError } from './errors.js';
export { type HttpHost, type HttpHostOptions, startHttpHost } from './http.js';
export { createMcpServer, type McpServerOptions } from './server.js';
export { type LoadedSnapshot, loadSnapshot, validateSnapshot } from './snapshot.js';
export type {
  CemAttribute,
  CemCssPart,
  CemCssProperty,
  CemDeclaration,
  CemEvent,
  CemMember,
  CemSlot,
  DocPage,
  Example,
  PackageMeta,
  SnapshotManifest,
} from './types.js';
