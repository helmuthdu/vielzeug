// .ts extension required: this file runs under vitest's own transform, same as every other script here.
/**
 * Vitest `globalSetup` — regenerates bundled MCP data before the suite runs if it's missing.
 *
 * `pretest` (package.json) already regenerates it unconditionally for `pnpm --dir packages/codex
 * test` / `pnpm --filter @vielzeug/codex test`, but that's a pnpm lifecycle hook: it never fires
 * for other ways this suite gets invoked (root-level `pnpm test` across the whole workspace,
 * `vitest` run directly, IDE test runners). Without this, those entry points fail with "Bundled
 * MCP data not found" instead of just working — see AGENTS.md's Testing section.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { log } from './_log.ts';
import { generateBundledData } from './generator.ts';
import { writeBundledData } from './write-bundled-data.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../data');
const dataFile = resolve(dataDir, 'vielzeug-data.json');

export default function setup(): void {
  if (existsSync(dataFile)) return;

  log(`Bundled data missing at ${dataFile} — generating before running tests.`);

  writeBundledData(dataDir, generateBundledData({ incremental: false }));
}
