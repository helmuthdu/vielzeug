#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer as createHttpServer } from 'node:http';
import { parseArgs } from 'node:util';

import type { BundledData } from './types.js';

import { loadData } from './data.js';
import { createServer } from './index.js';

function printUsage(): void {
  process.stderr.write(
    [
      'Usage: vielzeug-mcp [--port <number>]',
      '',
      'Options:',
      '  --port <number>   Run streamable HTTP transport on the specified port.',
      '  -h, --help        Show this help message.',
      '  -v, --version     Print mcp bundled version.',
    ].join('\n') + '\n',
  );
}

function resolvePort(raw: string | undefined): number | null {
  if (raw === undefined) {
    return null;
  }

  const n = Number.parseInt(raw, 10);

  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    throw new Error(`Invalid --port value: "${raw}". Expected an integer between 1 and 65535.`);
  }

  return n;
}

function setCorsHeaders(res: import('node:http').ServerResponse): void {
  res.setHeader('access-control-allow-headers', 'content-type, mcp-session-id');
  res.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('access-control-allow-origin', '*');
}

async function runHttpMode(port: number, data: BundledData): Promise<void> {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const mcpServer = createServer(data);
  const httpServer = createHttpServer();

  await mcpServer.connect(transport);

  httpServer.on('request', async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();

      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ status: 'ok' }));

      return;
    }

    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json; charset=utf-8');
      }

      if (!res.writableEnded) {
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
    }
  });

  httpServer.listen(port, () => {
    process.stderr.write(`vielzeug MCP server (HTTP) listening on http://localhost:${port}/\n`);
  });
}

async function runStdioMode(data: BundledData): Promise<void> {
  const transport = new StdioServerTransport();
  const mcpServer = createServer(data);

  await mcpServer.connect(transport);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();

    return;
  }

  const data = loadData();

  if (argv.includes('--version') || argv.includes('-v')) {
    process.stderr.write(`${data.mcpitVersion}\n`);

    return;
  }

  const { values } = parseArgs({
    options: {
      port: { type: 'string' },
    },
    strict: true,
  });

  const port = resolvePort(values.port as string | undefined);

  if (port !== null) {
    await runHttpMode(port, data);

    return;
  }

  await runStdioMode(data);
}

await main();
