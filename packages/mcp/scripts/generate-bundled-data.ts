#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateBundledData } from '../src/generator.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../data');
const outputFile = resolve(dataDir, 'vielzeug-data.json');
const cacheFile = resolve(dataDir, '.cache.json');

const { data, hashes } = generateBundledData({ incremental: true });

mkdirSync(dataDir, { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

if (hashes) {
  writeFileSync(cacheFile, `${JSON.stringify(hashes, null, 2)}\n`, 'utf8');
}

process.stderr.write(`Wrote bundled MCP data to ${outputFile}\n`);
