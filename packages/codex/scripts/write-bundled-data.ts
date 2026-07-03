// .ts extension required: this file runs under node --experimental-strip-types (scripts only, never compiled by tsc).
/**
 * Single place that persists a GeneratorResult to disk — generate-bundled-data.ts (CI/publish)
 * and dev.ts (local watch loop) used to each hand-roll this same mkdir + 4-file write sequence,
 * which had already drifted once (dev.ts was missing the CODEX_FORCE_REGEN-equivalent behavior).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GeneratorResult } from './generator.ts';

import { generateLlmsTxt } from './llms.ts';

export function writeBundledData(dataDir: string, result: GeneratorResult): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(resolve(dataDir, 'vielzeug-data.json'), `${JSON.stringify(result.data, null, 2)}\n`, 'utf8');

  if (result.hashes) {
    writeFileSync(resolve(dataDir, '.cache.json'), `${JSON.stringify(result.hashes, null, 2)}\n`, 'utf8');
  }

  const { llmsFullTxt, llmsTxt } = generateLlmsTxt(result.data);

  writeFileSync(resolve(dataDir, 'llms.txt'), llmsTxt, 'utf8');
  writeFileSync(resolve(dataDir, 'llms-full.txt'), llmsFullTxt, 'utf8');
}
