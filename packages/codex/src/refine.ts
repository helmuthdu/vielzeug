import type { Server } from '@modelcontextprotocol/server';
import type { RefineCatalog } from './refine-catalog.js';
import { createMcpServerWithTools, type McpServerOptions } from './server.js';
import { packageTools } from './tools/index.js';
import { refineTools } from './tools/refine.js';

/** Creates an MCP server with both package and Refine component tools. */
export function createMcpServerWithRefine(catalog: RefineCatalog, options: McpServerOptions): Server {
  return createMcpServerWithTools(catalog, options, [...packageTools, ...refineTools]);
}

export { type RefineCatalog, SnapshotRefineCatalog } from './refine-catalog.js';
export type {
  CemAttribute,
  CemCssPart,
  CemCssProperty,
  CemDeclaration,
  CemEvent,
  CemMember,
  CemSlot,
} from './types.js';
