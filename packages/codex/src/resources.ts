import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

import {
  ErrorCode,
  ListResourcesRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import type { BundledData } from './types.js';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

interface ResourceEntry {
  content: string;
  description: string;
  mimeType: string;
  name: string;
  uri: string;
}

export function registerResources(server: Server, data: BundledData): void {
  const entries: ResourceEntry[] = [];

  for (const pkg of data.packages) {
    for (const page of pkg.availableDocPages) {
      const content = pkg.docs[page];

      if (content) {
        entries.push({
          content,
          description: `${pkg.name} ${page} documentation`,
          mimeType: 'text/markdown',
          name: `${pkg.slug}/${page}`,
          uri: `vielzeug://docs/${pkg.slug}/${page}`,
        });
      }
    }

    if (pkg.apiSource !== null) {
      entries.push({
        content: pkg.apiSource,
        description: `${pkg.name} public API source (src/index.ts)`,
        mimeType: 'text/x-typescript',
        name: `${pkg.slug}/source`,
        uri: `vielzeug://source/${pkg.slug}`,
      });
    }
  }

  const byUri = new Map(entries.map((e) => [e.uri, e]));

  server.setRequestHandler(ListResourcesRequestSchema, () => ({
    resources: entries.map(({ content: _content, ...meta }) => meta),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, (request) => {
    const entry = byUri.get(request.params.uri);

    if (!entry) {
      throw new McpError(ErrorCode.InvalidParams, `Resource not found: ${request.params.uri}`);
    }

    return {
      contents: [{ mimeType: entry.mimeType, text: entry.content, uri: entry.uri }],
    };
  });
}
