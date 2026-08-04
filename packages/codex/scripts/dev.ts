#!/usr/bin/env node
import { type ChildProcess, spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { log } from './_log.ts';
import { generateSnapshot } from './generator.ts';
import { writeDevSnapshot } from './write-bundled-data.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const snapshotDir = resolve(packageRoot, '.dev');
const port = process.env['CODEX_PORT'] ?? '3001';

writeDevSnapshot(snapshotDir, generateSnapshot());

const server = spawn(
  process.execPath,
  ['--experimental-strip-types', '--watch', '--watch-path=src', '--watch-path=.dev', 'src/cli.ts', `--port=${port}`, '--snapshot=.dev'],
  { cwd: packageRoot, stdio: 'inherit' },
);
const watcher = spawn(process.execPath, ['--experimental-strip-types', './scripts/watch-data.ts'], { cwd: packageRoot, stdio: 'inherit' });
const children: ChildProcess[] = [server, watcher];

function shutdown(): void {
  for (const child of children) child.kill('SIGTERM');
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
log(`dev server running on http://127.0.0.1:${port}/`);
