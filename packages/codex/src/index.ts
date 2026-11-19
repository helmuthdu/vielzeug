/**
 * `@vielzeug/codex`: supported public contract.
 *
 * The MCP server factory (which loads the bundled snapshot by default), the loopback HTTP host,
 * and the error type. Everything else — the catalog, the snapshot loader, the tool tables — is
 * internal and may change without notice.
 */

export { CodexError } from './errors.js';
export { type HttpHost, type HttpHostOptions, startHttpHost } from './http.js';
export { type CodexServerOptions, createCodexServer } from './server.js';
export type { Snapshot } from './types.js';
