#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import type { Server } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

import { log } from './_log.js';
import { startHttpHost } from './http.js';
import { resolvePort } from './port.js';
import { SnapshotRefineCatalog } from './refine-catalog.js';
import { createMcpServer } from './server.js';
import { installSkills, SKILL_TARGET_CANDIDATES } from './skills.js';
import { loadSnapshot } from './snapshot.js';
import { registerRefineTools } from './tools/refine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function usage(): void {
  log(
    [
      'Usage: codex [--port=<number>] [--snapshot=<directory>] [--debug]',
      '       codex skills install [--target=<directory>] [--force]',
      '',
      'Options:',
      '  --port=<number>        Run Streamable HTTP on loopback.',
      '  --snapshot=<directory> Load a snapshot directory.',
      '  --debug                Log tool timings and expected tool errors.',
      '  -h, --help             Show help.',
      '  -v, --version          Print version.',
      '',
      'Skills:',
      '  skills install         Copy the bundled agent skill(s) into the project.',
      `  --target=<directory>   Skills directory. Default: first existing of ${SKILL_TARGET_CANDIDATES.join(', ')}.`,
      '  --force                Overwrite an already installed skill.',
    ].join('\n'),
  );
}

function runSkills(argv: readonly string[]): number {
  const [action, ...rest] = argv;

  if (action !== 'install') {
    log(`error: unknown skills command "${action ?? ''}" (expected: install)`);

    return 1;
  }

  const { values } = parseArgs({
    args: rest,
    options: { force: { type: 'boolean' }, target: { type: 'string' } },
    strict: true,
  });
  const installed = installSkills({ force: values.force, target: values.target });

  for (const skill of installed) log(`installed skill "${skill.name}" → ${skill.path}`);

  return 0;
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

  if (argv[0] === 'skills') {
    try {
      return runSkills(argv.slice(1));
    } catch (error) {
      log(`error: ${error instanceof Error ? error.message : String(error)}`);

      return 1;
    }
  }

  let values: { debug?: boolean; port?: string; snapshot?: string };

  try {
    ({ values } = parseArgs({
      args: argv,
      options: { debug: { type: 'boolean' }, port: { type: 'string' }, snapshot: { type: 'string' } },
      strict: true,
    }));

    const snapshot = loadSnapshot(values.snapshot);
    const catalog = new SnapshotRefineCatalog(snapshot);
    const port = resolvePort(values.port);
    const configure = (server: Server): void => registerRefineTools(server, catalog, values.debug);

    if (port === null) {
      const server = createMcpServer(catalog, { debug: values.debug, version: snapshot.manifest.version });

      configure(server);
      await server.connect(new StdioServerTransport());

      return 0;
    }

    const host = await startHttpHost({
      catalog,
      configureServer: configure,
      debug: values.debug,
      port,
      version: snapshot.manifest.version,
    });
    const shutdown = (): void => {
      void host.dispose().then(
        () => {
          process.exitCode = 0;
        },
        (error: unknown) => {
          log(`error: failed to shut down HTTP host: ${error instanceof Error ? error.message : String(error)}`);
          process.exitCode = 1;
        },
      );
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
