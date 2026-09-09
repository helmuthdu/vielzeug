import type { Server, Tool } from '@modelcontextprotocol/server';

import { METHOD_NOT_FOUND, ProtocolError } from '@modelcontextprotocol/server';
import { log } from '../_log.js';
import { type Catalog, CatalogError } from '../catalog.js';
import { packageTools } from './packages.js';
import type { ToolDefinition } from './shared.js';

export { packageTools };

function content(value: unknown) {
  return {
    content: [{ text: typeof value === 'string' ? value : JSON.stringify(value, null, 2), type: 'text' as const }],
  };
}

export function registerTools<CatalogType extends Catalog>(
  server: Server,
  catalog: CatalogType,
  tools: readonly ToolDefinition<CatalogType>[],
  debug = false,
): void {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  server.setRequestHandler('tools/list', () => ({
    tools: tools.map(
      ({ description, inputSchema, name }): Tool => ({
        description,
        inputSchema: inputSchema as unknown as Tool['inputSchema'],
        name,
      }),
    ),
  }));
  server.setRequestHandler('tools/call', (request) => {
    const tool = byName.get(request.params.name);

    if (!tool) throw new ProtocolError(METHOD_NOT_FOUND, `Unknown tool: ${request.params.name}`);

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
