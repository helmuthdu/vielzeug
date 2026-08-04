#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { log } from './_log.js';
import { SnapshotCatalog } from './catalog.js';
import { startHttpHost } from './http.js';
import { resolvePort } from './port.js';
import { createMcpServer } from './server.js';
import { loadSnapshot } from './snapshot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function usage(): void {
  log(
    [
      'Usage: codex [--port=<number>] [--snapshot=<directory>] [--debug]',
      '',
      'Options:',
      '  --port=<number>        Run Streamable HTTP on loopback.',
      '  --snapshot=<directory> Load a snapshot directory.',
      '  --debug                Log tool timings and expected tool errors.',
      '  -h, --help             Show help.',
      '  -v, --version          Print version.',
    ].join('\n'),
  );
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    usage();

    return 0;
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as { version: string };

    process.stdout.write(`${pkg.version}\n`);

    return 0;
  }

  let values: { debug?: boolean; port?: string; snapshot?: string };

  try {
    ({ values } = parseArgs({
      args: argv,
      options: { debug: { type: 'boolean' }, port: { type: 'string' }, snapshot: { type: 'string' } },
      strict: true,
    }));

    const snapshot = loadSnapshot(values.snapshot);
    const catalog = new SnapshotCatalog(snapshot);
    const port = resolvePort(values.port);

    if (port === null) {
      await createMcpServer(catalog, { debug: values.debug, version: snapshot.manifest.version }).connect(
        new StdioServerTransport(),
      );

      return 0;
    }

    const host = await startHttpHost({ catalog, debug: values.debug, port, version: snapshot.manifest.version });
    const shutdown = (): void => {
      void host.dispose().then(() => {
        process.exitCode = 0;
      });
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);

    return 0;
  } catch (error) {
    log(`error: ${error instanceof Error ? error.message : String(error)}`);

    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = await main();
}
