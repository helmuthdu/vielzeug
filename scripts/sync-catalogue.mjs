#!/usr/bin/env node
// Compatibility wrapper for older command names. The structured `.ai/data` model is
// now the canonical source of package metadata, so catalogue sync is just one facet
// of the broader AI-data sync.

export { main } from './sync-ai-data.mjs';

import { isMain, parseArgs } from './lib/cli.mjs';
import { main } from './sync-ai-data.mjs';

if (isMain(import.meta.url)) {
  const { flags } = parseArgs(process.argv.slice(2));
  const ok = main({ check: Boolean(flags.check) });
  if (!ok) process.exitCode = 1;
}
