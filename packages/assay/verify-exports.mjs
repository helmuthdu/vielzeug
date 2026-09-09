import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const assay of modules) {
  if (typeof assay.eventually !== 'function') throw new Error('eventually export missing');
  if ('retry' in assay) throw new Error('removed retry export present');

  const error = new assay.AssayTimeoutError('timeout');
  if (!(error instanceof assay.AssayError)) throw new Error('AssayError identity mismatch');
  if (error.name !== 'AssayTimeoutError') throw new Error(`unexpected error name: ${error.name}`);
}
