#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { log } from './_log.ts';
import { generateBundledData } from './generator.ts';
import { writeBundledData } from './write-bundled-data.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../data');

const incremental = !process.env['CODEX_FORCE_REGEN'];
const result = generateBundledData({ incremental });

writeBundledData(dataDir, result);
log(`Wrote bundled MCP data to ${resolve(dataDir, 'vielzeug-data.json')}`);
log(`Wrote llms.txt and llms-full.txt to ${dataDir}`);
