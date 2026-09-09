/**
 * `@vielzeug/codex/advanced` — snapshot parser internals.
 *
 * The main entry (`@vielzeug/codex`) keeps the supported catalog, loader, and server
 * contracts. These pure validation parsers and raw snapshot types
 * are the smaller, less stable contract used by generators and integration tests —
 * import them explicitly from this subpath when you need to parse individual snapshot
 * chunks rather than loading a whole validated snapshot.
 */
export { CodexError } from './errors.js';
export {
  type LoadedSnapshot,
  loadSnapshotDirectory,
  parseCatalog,
  parseContent,
  parseManifest,
  parsePointer,
  parseRefine,
  parseSearch,
  validateSnapshot,
} from './snapshot.js';
export {
  type CatalogFile,
  DOC_PAGES,
  type SearchRecord,
  SNAPSHOT_SCHEMA_VERSION,
  type SnapshotPointer,
} from './types.js';
