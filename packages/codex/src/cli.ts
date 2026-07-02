#!/usr/bin/env node
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import type { HttpServerHandle } from './http.js';
import type { BundledData } from './types.js';

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

/** CLI entry point. Exported for testing — invoke directly with a custom argv instead of spawning a subprocess. */
export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
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

    return;
  }

  let port: number | null;
  let mcpServer: Server;
  let data: BundledData;

  try {
    data = loadData();
    port = resolvePort(values.port);
    mcpServer = createServer(data);
  } catch (err) {
    log(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);

    return;
  }

  if (port !== null) {
    let handle: HttpServerHandle;

    try {
      handle = await startHttpServer(mcpServer, port, () => createServer(data));
    } catch (err) {
      const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
      const detail = code === 'EADDRINUSE' ? `port ${port} is already in use.` : String(err);

      log(`error: ${detail}`);
      process.exit(1);

      return;
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

// Only auto-run when executed directly (e.g. `node dist/cli.js`), not when imported by tests.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
