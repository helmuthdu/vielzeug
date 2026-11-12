import { existsSync } from 'node:fs';

for (const file of ['dist/index.d.ts', 'skills/vielzeug/SKILL.md']) {
  if (!existsSync(file)) throw new Error(`missing packaged file: ${file}`);
}

const root = await import('./dist/index.js');

for (const name of [
  'CatalogError',
  'CodexError',
  'SnapshotCatalog',
  'StdioServerTransport',
  'createMcpServer',
  'loadSnapshot',
  'startHttpHost',
]) {
  if (typeof root[name] !== 'function') throw new Error(`root export missing or not a function: ${name}`);
}

if (!('getComponent' in root.SnapshotCatalog.prototype))
  throw new Error('component lookup missing from the single catalog');
