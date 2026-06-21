#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { log } from './_log.ts';
import { generateBundledData } from './generator.ts';
import { generateLlmsTxt } from './llms.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../data');
const outputFile = resolve(dataDir, 'vielzeug-data.json');
const cacheFile = resolve(dataDir, '.cache.json');

const incremental = !process.env['CODEX_FORCE_REGEN'];
const { data, hashes } = generateBundledData({ incremental });

mkdirSync(dataDir, { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

if (hashes) {
  writeFileSync(cacheFile, `${JSON.stringify(hashes, null, 2)}\n`, 'utf8');
}

const { llmsFullTxt, llmsTxt } = generateLlmsTxt(data);

writeFileSync(resolve(dataDir, 'llms.txt'), llmsTxt, 'utf8');
writeFileSync(resolve(dataDir, 'llms-full.txt'), llmsFullTxt, 'utf8');

log(`Wrote bundled MCP data to ${outputFile}`);
log(`Wrote llms.txt and llms-full.txt to ${dataDir}`);
