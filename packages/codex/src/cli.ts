#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { loadData } from './data.js';
import { startHttpServer } from './http.js';
import { createServer } from './index.js';
import { resolvePort } from './port.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_VERSION: string = String(
  (JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as { version?: string }).version ?? '0.0.0',
);

function printUsage(): void {
  process.stderr.write(
    [
      'Usage: vielzeug-mcp [--port <number>]',
      '',
      'Options:',
      '  --port <number>   Run streamable HTTP transport on the specified port.',
      '  -h, --help        Show this help message.',
      '  -v, --version     Print package version.',
    ].join('\n') + '\n',
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();

    return;
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    process.stderr.write(`${PKG_VERSION}\n`);

    return;
  }

  const data = loadData();
  const { values } = parseArgs({
    options: { port: { type: 'string' } },
    strict: true,
  });

  const port = resolvePort(values.port);
  const mcpServer = createServer(data);

  if (port !== null) {
    await startHttpServer(mcpServer, port);

    return;
  }

  const transport = new StdioServerTransport();

  await mcpServer.connect(transport);
}

await main();
