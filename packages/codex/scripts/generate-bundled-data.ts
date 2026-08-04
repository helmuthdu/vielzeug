#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { log } from './_log.ts';
import { generateSnapshot } from './generator.ts';
import { writeSnapshot } from './write-bundled-data.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const snapshotDir = resolve(__dirname, '../data');

writeSnapshot(snapshotDir, generateSnapshot());
log(`Published snapshot to ${snapshotDir}`);
