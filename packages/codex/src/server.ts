import { Server } from '@modelcontextprotocol/server';

import type { Catalog } from './catalog.js';

import { packageTools, registerTools } from './tools/index.js';

/**
 * Creates an MCP server with the generic package tools registered. Refine-specific
 * tools are opt-in via `@vielzeug/codex/refine`'s `registerRefineTools()` — the main
 * library entry stays product-agnostic.
 */
export function createMcpServer(catalog: Catalog, options: { debug?: boolean; version: string }): Server {
  const server = new Server({ name: 'vielzeug', version: options.version }, { capabilities: { tools: {} } });

  registerTools(server, catalog, packageTools, options.debug);

  return server;
}
