#!/usr/bin/env node
import { watch } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { log } from './_log.ts';
import { generateSnapshot, generatorWatchRoots } from './generator.ts';
import { writeDevSnapshot } from './write-bundled-data.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const snapshotDir = resolve(__dirname, '../.dev');
let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let pending = false;

function refresh(): void {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  try {
    writeDevSnapshot(snapshotDir, generateSnapshot({ repoRoot }));
    log('watch: snapshot refreshed');
  } catch (error) {
    log(`watch: snapshot refresh failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    running = false;
    if (pending) {
      pending = false;
      refresh();
    }
  }
}

for (const root of generatorWatchRoots(repoRoot)) {
  watch(root, { recursive: true }, (_event, file) => {
    if (!file || !/\.(?:json|md|ts)$/.test(file)) return;
    // The snapshot dir lives inside packages/, so its own writes would re-trigger this watcher
    // forever (each refresh rewrites manifest.json/catalog.json, which match the filter).
    // Skip anything under it: it is this watcher's output, never an input.
    if (resolve(root, file).startsWith(`${snapshotDir}${process.platform === 'win32' ? '\\' : '/'}`)) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(refresh, 200);
  });
}

log('watch: observing all snapshot inputs');
