#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseArgs } from 'node:util';

import { loadData } from './data.js';
import { startHttpServer } from './http.js';
import { createServer } from './index.js';
import { resolvePort } from './port.js';

function printUsage(): void {
  process.stderr.write(
    [
      'Usage: codex [--port <number>]',
      '',
      'Options:',
      '  --port <number>   Run streamable HTTP transport on the specified port.',
      '  -h, --help        Show this help message.',
      '  -v, --version     Print bundled data version.',
    ].join('\n') + '\n',
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();

    return;
  }

  const data = loadData();

  if (argv.includes('--version') || argv.includes('-v')) {
    process.stdout.write(`${data.version}\n`);

    return;
  }

  let values: { port?: string };

  try {
    ({ values } = parseArgs({ args: argv, options: { port: { type: 'string' } }, strict: true }));
  } catch (err) {
    process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
    printUsage();
    process.exit(1);
  }

  const port = resolvePort(values.port);
  const mcpServer = createServer(data);

  if (port !== null) {
    let handle;

    try {
      handle = await startHttpServer(mcpServer, port);
    } catch (err) {
      const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
      const detail = code === 'EADDRINUSE' ? `port ${port} is already in use.` : String(err);

      process.stderr.write(`error: ${detail}\n`);
      process.exit(1);
    }

    const shutdown = (): void => {
      handle.dispose().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    };

    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);

    return;
  }

  const transport = new StdioServerTransport();

  await mcpServer.connect(transport);
}

await main();
