import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import type { BundledData } from './types.js';

import { registerResources } from './resources.js';
import { registerTools } from './tools.js';

export function createServer(data: BundledData): Server {
  const server = new Server(
    { name: 'vielzeug', version: data.version },
    { capabilities: { resources: {}, tools: {} } },
  );

  registerTools(server, data);
  registerResources(server, data);

  return server;
}
