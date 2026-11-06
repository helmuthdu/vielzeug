#!/usr/bin/env node
import { type ChildProcess, spawn } from 'node:child_process';
import { watch } from 'node:fs';
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

// The server loads its .dev snapshot once at startup, so it must restart whenever the watcher
// rewrites that snapshot or the server's own sources change. Node's `--watch --watch-path`
// used to provide that, but Node cannot run src/cli.ts at all: the sources import each other
// through NodeNext-style `./x.js` specifiers, which --experimental-strip-types does not
// rewrite to .ts, so it dies with ERR_MODULE_NOT_FOUND. Bun resolves those specifiers, so the
// server runs under bun and this script owns the restart loop instead of a runtime flag.
let server: ChildProcess;
let restartTimer: ReturnType<typeof setTimeout> | undefined;
let shuttingDown = false;

function startServer(): void {
  server = spawn('bun', ['src/cli.ts', `--port=${port}`, '--snapshot=.dev'], { cwd: packageRoot, stdio: 'inherit' });
}

function scheduleRestart(): void {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    restartTimer = undefined;
    // The exit handler starts the replacement; killing a server that already exited would be a no-op.
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGTERM');
  }, 100);
}

const watcher = spawn('bun', ['./scripts/watch-data.ts'], { cwd: packageRoot, stdio: 'inherit' });

startServer();
server.on('exit', () => {
  if (!shuttingDown) startServer();
});

for (const root of [resolve(packageRoot, 'src'), snapshotDir]) {
  watch(root, { recursive: true }, (_event, file) => {
    if (file && /\.(?:json|md|ts)$/.test(file)) scheduleRestart();
  });
}

function shutdown(): void {
  shuttingDown = true;
  server.kill('SIGTERM');
  watcher.kill('SIGTERM');
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
log(`dev server running on http://127.0.0.1:${port}/`);
