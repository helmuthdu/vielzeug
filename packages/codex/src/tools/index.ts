import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';

import type { ToolDefinition } from './shared.js';

import { log } from '../_log.js';
import { CatalogError, type Catalog } from '../catalog.js';
import { packageTools } from './packages.js';
import { refineTools } from './refine.js';

export const ALL_TOOLS: readonly ToolDefinition[] = [...packageTools, ...refineTools];

const byName = new Map(ALL_TOOLS.map((tool) => [tool.name, tool]));

function content(value: unknown) {
  return {
    content: [{ text: typeof value === 'string' ? value : JSON.stringify(value, null, 2), type: 'text' as const }],
  };
}

export function registerTools(server: Server, catalog: Catalog, debug = false): void {
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: ALL_TOOLS.map(({ description, inputSchema, name }) => ({ description, inputSchema, name })),
  }));
  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const tool = byName.get(request.params.name);

    if (!tool) throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);

    const started = Date.now();

    try {
      const result = tool.execute(request.params.arguments ?? {}, catalog);

      if (debug) log(`${tool.name} ${Date.now() - started}ms`);

      return content(result);
    } catch (error) {
      if (error instanceof CatalogError) {
        if (debug) log(`${tool.name} ${error.code}: ${error.message}`);

        return {
          content: [{ text: JSON.stringify({ code: error.code, message: error.message }), type: 'text' as const }],
          isError: true,
        };
      }

      throw error;
    }
  });
}
