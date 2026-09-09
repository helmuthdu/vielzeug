import { existsSync } from 'node:fs';

for (const file of ['dist/index.d.ts', 'dist/advanced.d.ts', 'dist/refine.d.ts']) {
  if (!existsSync(file)) throw new Error(`missing declaration: ${file}`);
}

const root = await import('./dist/index.js');
const advanced = await import('./dist/advanced.js');
const refine = await import('./dist/refine.js');

if (typeof root.StdioServerTransport !== 'function') throw new Error('StdioServerTransport root export missing');
if ('registerRefineTools' in root) throw new Error('Refine tools leaked into root entry');
if ('listComponents' in root.SnapshotCatalog.prototype)
  throw new Error('Refine catalog methods leaked into generic catalog');
if (!Array.isArray(advanced.DOC_PAGES)) throw new Error('DOC_PAGES advanced export missing');
if (typeof refine.SnapshotRefineCatalog !== 'function') throw new Error('SnapshotRefineCatalog export missing');
if (typeof refine.registerRefineTools !== 'function') throw new Error('Refine registration export missing');
