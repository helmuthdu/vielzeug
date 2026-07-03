#!/usr/bin/env node
/**
 * Dev orchestrator.
 *
 * Runs the CLI directly against src/ via `--experimental-strip-types` + `--watch`
 * instead of gating startup on a `tsc --watch` compile step: the previous version parsed
 * tsc's human-readable watch output ("Found 0 errors") as a readiness signal, which is
 * fragile (breaks if TypeScript ever changes that string) and adds a compile step dev
 * iteration doesn't need — `pnpm build` remains the source of truth for type-checking
 * and for producing dist/ for publishing.
 *
 * Startup sequence:
 *   1. Run prepare:data inline (fast, no subprocess).
 *   2. Spawn the CLI (node --watch over src/ + data/) and the docs watcher in parallel.
 *
 * On SIGINT/SIGTERM: kills all children cleanly before exiting.
 *
 * Usage: node --experimental-strip-types ./scripts/dev.ts
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { log } from './_log.ts';
import { generateBundledData } from './generator.ts';
import { writeBundledData } from './write-bundled-data.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const dataDir = resolve(packageRoot, 'data');
const port = process.env['CODEX_PORT'] ?? '3001';

// ---------------------------------------------------------------------------
// Step 1: initial data generation (inline — faster than a subprocess)
// ---------------------------------------------------------------------------

log('generating bundled data…');
writeBundledData(dataDir, generateBundledData({ incremental: true }));
log('bundled data ready — starting server and watcher');

// ---------------------------------------------------------------------------
// Step 2: spawn the CLI (watching src/ + data/) and watch:data in parallel
// ---------------------------------------------------------------------------

const server = spawn(
  process.execPath,
  ['--experimental-strip-types', '--watch', '--watch-path=src', '--watch-path=data', 'src/cli.ts', '--port', port],
  { cwd: packageRoot, stdio: 'inherit' },
);

const watcher = spawn(process.execPath, ['--experimental-strip-types', './scripts/watch-data.ts'], {
  cwd: packageRoot,
  stdio: 'inherit',
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const children: ChildProcess[] = [server, watcher];

function shutdown(): void {
  log('shutting down…');

  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {
      // already gone
    }
  }

  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

for (const child of children) {
  child.on('error', (err) => log(`child process error: ${err.message}`));
}

log(`dev server running on http://localhost:${port}/ (SSE: http://localhost:${port}/sse)`);
