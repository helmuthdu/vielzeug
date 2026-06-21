#!/usr/bin/env node
/**
 * Watches docs/ for changes and re-runs prepare:data automatically.
 * Uses only Node built-ins (fs.watch, child_process) — no extra deps.
 *
 * Usage: node --experimental-strip-types ./scripts/watch-data.ts
 */
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { log } from './_log.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = resolve(__dirname, '../../../docs');
const scriptPath = resolve(__dirname, './generate-bundled-data.ts');

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let dirty = false;

function regenerate(): void {
  if (running) {
    dirty = true;

    return;
  }

  running = true;
  dirty = false;

  log('watch: docs changed — regenerating data…');

  const child = spawn(process.execPath, ['--experimental-strip-types', scriptPath], { stdio: 'inherit' });

  child.on('close', (code) => {
    running = false;

    if (code === 0) {
      log('watch: data regenerated ✓');
    } else {
      log(`watch: generate-bundled-data exited with code ${code ?? '?'}`);
    }

    if (dirty) regenerate();
  });
}

watch(docsDir, { recursive: true }, (_event, filename) => {
  if (!filename?.endsWith('.md') && !filename?.endsWith('.ts')) return;

  if (debounceTimer !== null) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(regenerate, 300);
});

log(`watch: watching ${docsDir} for changes…`);
