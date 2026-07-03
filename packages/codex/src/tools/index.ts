import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';

import type { ToolContext, ToolDefinition } from './shared.js';

import { log } from '../_log.js';
import { ToolError } from '../errors.js';
import { packageTools } from './packages.js';
import { refineTools } from './refine.js';

export { buildToolContext, type ToolContext } from './shared.js';

// One flat list: generic package tools first, then refine's structured-metadata tools.
// Deliberately no sandbox/ore/spell-specific tools — those used to hand-duplicate (and,
// for sandbox, actively misrepresent) API surface already covered accurately by the
// generic get-docs/get-source/get-type-signature tools above. See docs/sandbox/api.md,
// docs/ore/api.md, docs/spell/api.md for that reference material instead.
//
// Exported (not just a local const) so scripts/generate-tool-docs.ts can render the
// README tables straight from this registry instead of a hand-maintained copy.
export const ALL_TOOLS: ToolDefinition[] = [...packageTools, ...refineTools];

const TOOL_MAP = new Map(ALL_TOOLS.map((t) => [t.name, t]));

const DEBUG = process.env['CODEX_DEBUG'] === '1';

function debugArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args)
    .map(
      ([k, v]) =>
        `${k}=${typeof v === 'string' ? JSON.stringify(v.length > 40 ? `${v.slice(0, 40)}…` : v) : String(v)}`,
    )
    .join(', ');

  return entries ? `(${entries})` : '()';
}

export function registerTools(server: Server, context: ToolContext): void {
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: ALL_TOOLS.map((tool) => ({ description: tool.description, inputSchema: tool.inputSchema, name: tool.name })),
  }));

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const tool = TOOL_MAP.get(request.params.name);

    if (!tool) {
      if (DEBUG) log(`[codex] tool not found: ${request.params.name}`);

      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    }

    const args = request.params.arguments ?? {};

    if (DEBUG) log(`[codex] → ${tool.name}${debugArgs(args)}`);

    const t0 = DEBUG ? Date.now() : 0;

    try {
      const result = tool.run(args, context);

      if (DEBUG) log(`[codex] ✓ ${tool.name} (${Date.now() - t0}ms)`);

      return result;
    } catch (err) {
      // Every expected failure (bad arg, unknown slug/tag, missing bundled data) is a
      // ToolError; anything else is a real bug and is left to propagate as a protocol error.
      if (err instanceof ToolError) {
        if (DEBUG) log(`[codex] ✗ ${tool.name} ${err.code}: ${err.message}`);

        return {
          content: [{ text: JSON.stringify({ code: err.code, message: err.message }), type: 'text' }],
          isError: true,
        };
      }

      if (DEBUG) log(`[codex] ✗ ${tool.name} threw: ${err instanceof Error ? err.message : String(err)}`);

      throw err;
    }
  });
}
