import { existsSync } from 'node:fs';

for (const file of ['dist/index.d.ts', 'skills/vielzeug/SKILL.md', 'data/snapshot.json']) {
  if (!existsSync(file)) throw new Error(`missing packaged file: ${file}`);
}

const root = await import('./dist/index.js');

for (const name of ['CodexError', 'createCodexServer', 'startHttpHost']) {
  if (typeof root[name] !== 'function') throw new Error(`root export missing or not a function: ${name}`);
}

// The public surface is exactly these three; anything else is an accidental export.
const exported = Object.keys(root).sort();

if (exported.join() !== 'CodexError,createCodexServer,startHttpHost')
  throw new Error(`root exports drifted from the public contract: ${exported.join(', ')}`);
