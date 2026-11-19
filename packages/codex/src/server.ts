import { Server } from '@modelcontextprotocol/server';

import { Catalog } from './catalog.js';
import { bundledSnapshotPath, loadSnapshot } from './snapshot.js';
import { registerTools } from './tools/index.js';
import { packageTools } from './tools/packages.js';
import { refineTools } from './tools/refine.js';
import type { Snapshot } from './types.js';

export interface CodexServerOptions {
  debug?: boolean;
  /** Snapshot file path or a previously loaded snapshot. Defaults to the bundled snapshot file. */
  snapshot?: string | Snapshot;
}

/**
 * Creates the MCP server: the generic package tools plus the `refine-*` tools when the snapshot
 * actually carries Refine components (tools that would only answer "unavailable" are not offered
 * at all). The snapshot version travels in the server `instructions`, so every client sees which
 * version its answers describe without a tool call.
 */
export function createCodexServer(options: CodexServerOptions = {}): Server {
  const snapshot: Snapshot =
    typeof options.snapshot === 'object' ? options.snapshot : loadSnapshot(options.snapshot ?? bundledSnapshotPath());
  const catalog = new Catalog(snapshot);
  const tools = catalog.components.length > 0 ? [...packageTools, ...refineTools] : packageTools;
  const server = new Server(
    { name: 'vielzeug', version: snapshot.version },
    {
      capabilities: { tools: {} },
      instructions: `Answers about @vielzeug/* packages, generated from codex snapshot ${snapshot.version}. Compare this version with the @vielzeug/* versions installed in the project before recommending APIs. Start with list-packages or search; use get-docs with a section to fetch compact answers.`,
    },
  );

  registerTools(server, catalog, tools, options.debug);

  return server;
}
