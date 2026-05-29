#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseArgs } from 'node:util';

import { loadData } from './data.js';
import { startHttpServer } from './http.js';
import { createServer } from './index.js';

function printUsage(): void {
  process.stderr.write(
    [
      'Usage: vielzeug-mcp [--port <number>]',
      '',
      'Options:',
      '  --port <number>   Run streamable HTTP transport on the specified port.',
      '  -h, --help        Show this help message.',
      '  -v, --version     Print bundled data version.',
    ].join('\n') + '\n',
  );
}

function resolvePort(raw: string | undefined): number | null {
  if (raw === undefined) return null;

  const n = Number.parseInt(raw, 10);

  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    throw new Error(`Invalid --port value: "${raw}". Expected an integer between 1 and 65535.`);
  }

  return n;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();

    return;
  }

  const data = loadData();

  if (argv.includes('--version') || argv.includes('-v')) {
    process.stderr.write(`${data.version}\n`);

    return;
  }

  const { values } = parseArgs({
    options: { port: { type: 'string' } },
    strict: true,
  });

  const port = resolvePort(values.port as string | undefined);
  const mcpServer = createServer(data);

  if (port !== null) {
    await startHttpServer(mcpServer, port);

    return;
  }

  const transport = new StdioServerTransport();

  await mcpServer.connect(transport);
}

await main();
