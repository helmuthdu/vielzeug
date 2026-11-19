#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

import { log } from './_log.js';
import { CodexError } from './errors.js';
import { startHttpHost } from './http.js';
import { createCodexServer } from './server.js';
import { installSkills, SKILL_TARGET_CANDIDATES } from './skills.js';
import { loadSnapshot } from './snapshot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Parses and validates a --port CLI argument. Returns the port number or null if omitted. */
function resolvePort(raw: string | undefined): number | null {
  if (raw === undefined) return null;

  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new CodexError(`Invalid --port value: "${raw}". Expected an integer between 1 and 65535.`);
  }

  return port;
}

function usage(): void {
  log(
    [
      'Usage: codex [--port=<number>] [--snapshot=<file>] [--debug]',
      '       codex skills install [--target=<directory>] [--force]',
      '',
      'Options:',
      '  --port=<number>     Run Streamable HTTP on loopback.',
      '  --snapshot=<file>   Load a snapshot JSON file.',
      '  --debug             Log tool timings and expected tool errors.',
      '  -h, --help          Show help.',
      '  -v, --version       Print version.',
      '',
      'Skills:',
      '  skills install      Copy the bundled agent skill(s) into the project.',
      `  --target=<directory> Skills directory. Default: first existing of ${SKILL_TARGET_CANDIDATES.join(', ')}.`,
      '  --force             Overwrite an already installed skill.',
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

    // Load once; every per-request HTTP server reuses the same parsed snapshot.
    const snapshot = loadSnapshot(values.snapshot);
    const port = resolvePort(values.port);

    if (port === null) {
      const server = createCodexServer({ debug: values.debug, snapshot });

      await server.connect(new StdioServerTransport());

      return 0;
    }

    const host = await startHttpHost({
      createServer: () => createCodexServer({ debug: values.debug, snapshot }),
      port,
      version: snapshot.version,
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

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exitCode = await main();
}
