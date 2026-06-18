import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import type { BundledData } from './types.js';

import { loadData } from './data.js';
import { registerTools } from './tools.js';

export { loadData, packageMeta, validateBundledData } from './data.js';
export type { HttpServerHandle } from './http.js';
export type { SearchHit } from './search.js';
export type { Server } from '@modelcontextprotocol/sdk/server/index.js';
export {
  type BundledData,
  type BundledPackage,
  type CemAttribute,
  type CemCssPart,
  type CemCssProperty,
  type CemDeclaration,
  type CemEvent,
  type CemMember,
  type CemSlot,
  type CemTypeRef,
  type DocPage,
  type PackageMeta,
  SCHEMA_VERSION,
} from './types.js';

export function createServer(data: BundledData): Server {
  const server = new Server({ name: 'vielzeug', version: data.version }, { capabilities: { tools: {} } });

  registerTools(server, data);

  return server;
}

/** Convenience factory: loads bundled data from disk and creates the MCP server in one call. */
export function createServerFromDisk(): Server {
  return createServer(loadData());
}
