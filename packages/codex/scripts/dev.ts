#!/usr/bin/env node
import { type ChildProcess, spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { log } from './_log.ts';
import { generateSnapshot, generatorWatchRoots } from './generator.ts';
import { writeSnapshot } from './write-bundled-data.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const repoRoot = resolve(packageRoot, '../..');
const snapshotDir = resolve(packageRoot, '.dev');
const port = process.env['CODEX_PORT'] ?? '3001';

// One process owns the whole dev loop: regenerate the snapshot when docs/packages change,
// then restart the server. The server is stopped before the snapshot swap so it can never
// lazily read a half-replaced directory, and the swap itself is milliseconds of downtime.
// The server runs under bun (not plain `node --watch`): the sources import each other
// through NodeNext-style `./x.js` specifiers, which Node's type stripping does not rewrite.
const IGNORED_WATCH_SEGMENTS = /^(?:node_modules|dist|\.dev(?:\.staging.*)?|data(?:\.staging.*)?)$/;

let server: ChildProcess | undefined;
let restartTimer: ReturnType<typeof setTimeout> | undefined;
let regenerating = false;
let pending = false;
let shuttingDown = false;

function startServer(): void {
  server = spawn('bun', ['src/cli.ts', `--port=${port}`, `--snapshot=${snapshotDir}`], {
    cwd: packageRoot,
    stdio: 'inherit',
  });
}

function stopServer(): Promise<void> {
  const current = server;

  server = undefined;
  if (!current || current.exitCode !== null || current.signalCode !== null) return Promise.resolve();

  return new Promise((resolveExit) => {
    current.once('exit', () => resolveExit());
    current.kill('SIGTERM');
  });
}

async function refresh(): Promise<void> {
  if (regenerating) {
    pending = true;
    return;
  }

  regenerating = true;
  try {
    // Generation is the slow part and is safe while the old server still answers requests.
    const snapshot = generateSnapshot({ repoRoot });

    await stopServer();
    writeSnapshot(snapshotDir, snapshot);
    if (!shuttingDown) startServer();
    log('snapshot refreshed, server restarted');
  } catch (error) {
    log(`refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    if (!shuttingDown && !server) startServer();
  } finally {
    regenerating = false;
    if (pending) {
      pending = false;
      await refresh();
    }
  }
}

function debounce(run: () => void): void {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(run, 200);
}

writeSnapshot(snapshotDir, generateSnapshot({ repoRoot }));
startServer();

// Watcher inputs are the generator's real sources. Everything else under the watched roots is
// output: this package's snapshot generations (.dev, .dev.staging-*, data, data.staging-*),
// every package's build output (dist), and installs (node_modules). Watching those would make
// each staging swap re-trigger its own regeneration.
function isSnapshotInput(file: string | null): boolean {
  if (!file) return false;
  // Refine's compiled manifest is a generator input, not watcher noise, even though it lives in a dist/.
  if (file.endsWith('custom-elements.json')) return true;
  if (!/\.(?:json|md|ts)$/.test(file)) return false;

  return !file.split(/[\\/]/).some((segment) => IGNORED_WATCH_SEGMENTS.test(segment));
}

// One refresh path: codex's own sources are snapshot inputs too (they serve the server AND the
// catalog entry), so the same regenerate-and-restart path covers server code changes.
const watchers = generatorWatchRoots(repoRoot).map((root) =>
  watch(root, { recursive: true }, (_event, file) => {
    if (isSnapshotInput(file)) debounce(() => void refresh());
  }),
);

function shutdown(): void {
  shuttingDown = true;
  for (const watcher of watchers) watcher.close();
  void stopServer().then(() => process.exit(0));
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
log(`dev server running on http://127.0.0.1:${port}/ (snapshot: ${snapshotDir})`);
