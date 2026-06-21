#!/usr/bin/env node
/**
 * Dev orchestrator — replaces the fragile shell composition in package.json.
 *
 * Startup sequence:
 *   1. Run prepare:data inline (fast, no subprocess).
 *   2. Spawn `tsc --watch` and wait for the first successful compilation.
 *   3. Only then spawn `dev:server` (node --watch on dist/) and `watch:data`.
 *
 * On SIGINT/SIGTERM: kills all children cleanly before exiting.
 *
 * Usage: node --experimental-strip-types ./scripts/dev.ts
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { log } from './_log.ts';
import { generateBundledData } from './generator.ts';
import { generateLlmsTxt } from './llms.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const dataDir = resolve(packageRoot, 'data');
const port = process.env['CODEX_PORT'] ?? '3001';

// ---------------------------------------------------------------------------
// Step 1: initial data generation (inline — faster than a subprocess)
// ---------------------------------------------------------------------------

log('generating bundled data…');

const { data, hashes } = generateBundledData({ incremental: true });

mkdirSync(dataDir, { recursive: true });
writeFileSync(resolve(dataDir, 'vielzeug-data.json'), `${JSON.stringify(data, null, 2)}\n`, 'utf8');

if (hashes) {
  writeFileSync(resolve(dataDir, '.cache.json'), `${JSON.stringify(hashes, null, 2)}\n`, 'utf8');
}

const { llmsFullTxt, llmsTxt } = generateLlmsTxt(data);

writeFileSync(resolve(dataDir, 'llms.txt'), llmsTxt, 'utf8');
writeFileSync(resolve(dataDir, 'llms-full.txt'), llmsFullTxt, 'utf8');

log('bundled data ready');

// ---------------------------------------------------------------------------
// Step 2: start tsc --watch, wait for first successful compilation
// ---------------------------------------------------------------------------

log('starting tsc --watch…');

const tsc = spawn('pnpm', ['exec', 'tsc', '--watch', '--preserveWatchOutput'], {
  cwd: packageRoot,
  stdio: ['ignore', 'pipe', 'inherit'],
});

tsc.stdout!.pipe(process.stdout);

await new Promise<void>((resolve, reject) => {
  let settled = false;

  const settle = (err?: Error): void => {
    if (settled) return;

    settled = true;

    if (err) reject(err);
    else resolve();
  };

  tsc.stdout!.on('data', (chunk: Buffer) => {
    if (chunk.toString().includes('Found 0 errors')) settle();
  });

  tsc.once('error', settle);

  tsc.once('close', (code) => {
    if (code !== 0) settle(new Error(`tsc exited with code ${code ?? '?'}`));
  });
});

log('tsc compilation ready — starting server and watcher');

// ---------------------------------------------------------------------------
// Step 3: spawn dev:server and watch:data in parallel
// ---------------------------------------------------------------------------

const server = spawn(
  process.execPath,
  ['--watch', '--watch-path=dist', '--watch-path=data', 'dist/cli.js', '--port', port],
  { cwd: packageRoot, stdio: 'inherit' },
);

const watcher = spawn(process.execPath, ['--experimental-strip-types', './scripts/watch-data.ts'], {
  cwd: packageRoot,
  stdio: 'inherit',
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const children: ChildProcess[] = [tsc, server, watcher];

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
