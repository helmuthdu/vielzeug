import { Server } from '@modelcontextprotocol/server';

import type { Catalog } from './catalog.js';

import { registerTools } from './tools/index.js';

export function createMcpServer(catalog: Catalog, options: { debug?: boolean; version: string }): Server {
  const server = new Server({ name: 'vielzeug', version: options.version }, { capabilities: { tools: {} } });

  registerTools(server, catalog, options.debug);

  return server;
}
