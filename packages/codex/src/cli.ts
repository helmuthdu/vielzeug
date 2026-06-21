#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { log } from './_log.js';
import { loadData } from './data.js';
import { startHttpServer } from './http.js';
import { resolvePort } from './port.js';
import { createServer } from './server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function printUsage(): void {
  log(
    [
      'Usage: codex [--port <number>]',
      '',
      'Options:',
      '  --port <number>   Run streamable HTTP transport on the specified port.',
      '  -h, --help        Show this help message.',
      '  -v, --version     Print package version.',
    ].join('\n'),
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();

    return;
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    const pkgJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as {
      version: string;
    };

    process.stdout.write(`${pkgJson.version}\n`);

    return;
  }

  let values: { port?: string };

  try {
    ({ values } = parseArgs({ args: argv, options: { port: { type: 'string' } }, strict: true }));
  } catch (err) {
    log(`error: ${err instanceof Error ? err.message : String(err)}`);
    printUsage();
    process.exit(1);
  }

  const data = loadData();
  const port = resolvePort(values.port);
  const mcpServer = createServer(data);

  if (port !== null) {
    let handle;

    try {
      handle = await startHttpServer(mcpServer, port, () => createServer(data));
    } catch (err) {
      const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
      const detail = code === 'EADDRINUSE' ? `port ${port} is already in use.` : String(err);

      log(`error: ${detail}`);
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

  try {
    await mcpServer.connect(transport);
  } catch (err) {
    log(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

await main();
