import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import type { BundledData } from './types.js';

import { registerResources } from './resources.js';
import { registerTools } from './tools.js';

export { loadData, packageMeta, validateBundledData } from './data.js';
export type { SearchHit } from './search.js';
export type { BundledData, BundledPackage, DocPage, PackageMeta } from './types.js';

export function createServer(data: BundledData): Server {
  const server = new Server(
    { name: 'vielzeug', version: data.version },
    { capabilities: { resources: {}, tools: {} } },
  );

  registerTools(server, data);
  registerResources(server, data);

  return server;
}
