import { Server } from '@modelcontextprotocol/server';

import type { Catalog } from './catalog.js';

import { packageTools, registerTools } from './tools/index.js';
import type { ToolDefinition } from './tools/shared.js';

export interface McpServerOptions {
  debug?: boolean;
  version: string;
}

export function createMcpServerWithTools<CatalogType extends Catalog>(
  catalog: CatalogType,
  options: McpServerOptions,
  tools: readonly ToolDefinition<CatalogType>[],
): Server {
  const server = new Server({ name: 'vielzeug', version: options.version }, { capabilities: { tools: {} } });

  registerTools(server, catalog, tools, options.debug);

  return server;
}

/** Creates an MCP server with the generic package tools registered. */
export function createMcpServer(catalog: Catalog, options: McpServerOptions): Server {
  return createMcpServerWithTools(catalog, options, packageTools);
}
