import { Server } from '@modelcontextprotocol/server';

import type { Catalog } from './catalog.js';

import { registerTools } from './tools/index.js';
import { packageTools } from './tools/packages.js';
import { refineTools } from './tools/refine.js';

export interface McpServerOptions {
  debug?: boolean;
  version: string;
}

/**
 * Creates the MCP server for a catalog: the generic package tools plus the `refine-*` component
 * tools when the snapshot actually carries Refine metadata (tools that would only answer
 * "unavailable" are not offered at all).
 */
export function createMcpServer(catalog: Catalog, options: McpServerOptions): Server {
  const server = new Server({ name: 'vielzeug', version: options.version }, { capabilities: { tools: {} } });
  const tools = catalog.listComponents().length > 0 ? [...packageTools, ...refineTools] : packageTools;

  registerTools(server, catalog, tools, options.debug);

  return server;
}
