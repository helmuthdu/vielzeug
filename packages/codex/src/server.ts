import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import type { BundledData } from './types.js';

import { loadData } from './data.js';
import { buildToolContext, registerTools } from './tools.js';

export function createServer(data: BundledData): Server {
  const server = new Server({ name: 'vielzeug', version: data.version }, { capabilities: { tools: {} } });

  registerTools(server, buildToolContext(data));

  return server;
}

/** Convenience factory: loads bundled data from disk and creates the MCP server in one call. */
export function createServerFromDisk(): Server {
  return createServer(loadData());
}
