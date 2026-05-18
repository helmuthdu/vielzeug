import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import type { BundledData } from './types.js';

import { registerTools } from './tools.js';

export function createServer(data: BundledData): Server {
  const server = new Server({ name: 'vielzeug', version: data.mcpitVersion }, { capabilities: { tools: {} } });

  registerTools(server, data);

  return server;
}
