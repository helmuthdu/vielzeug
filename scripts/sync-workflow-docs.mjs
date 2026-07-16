#!/usr/bin/env node
// Compatibility wrapper for the old workflow-doc command name. Task stubs are now
// generated from `.ai/data/tasks.json` by the unified AI-data sync.

export { assertValidTasks as assertValidManifest, main, taskStubContent as stubContent } from './sync-ai-data.mjs';

import { isMain, parseArgs } from './lib/cli.mjs';
import { main } from './sync-ai-data.mjs';

if (isMain(import.meta.url)) {
  const { flags } = parseArgs(process.argv.slice(2));
  const ok = await main({ check: Boolean(flags.check) });
  if (!ok) process.exitCode = 1;
}
