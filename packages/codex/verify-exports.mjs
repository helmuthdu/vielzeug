import { existsSync } from 'node:fs';

for (const file of ['dist/index.d.ts', 'dist/refine.d.ts', 'skills/vielzeug/SKILL.md']) {
  if (!existsSync(file)) throw new Error(`missing packaged file: ${file}`);
}

const root = await import('./dist/index.js');
const refine = await import('./dist/refine.js');

if (typeof root.StdioServerTransport !== 'function') throw new Error('StdioServerTransport root export missing');
if ('createMcpServerWithRefine' in root) throw new Error('Refine server factory leaked into root entry');
if ('listComponents' in root.SnapshotCatalog.prototype)
  throw new Error('Refine catalog methods leaked into generic catalog');
if (typeof refine.SnapshotRefineCatalog !== 'function') throw new Error('SnapshotRefineCatalog export missing');
if (typeof refine.createMcpServerWithRefine !== 'function') throw new Error('Refine server factory export missing');
if ('registerRefineTools' in refine) throw new Error('Obsolete Refine registration export remains');
