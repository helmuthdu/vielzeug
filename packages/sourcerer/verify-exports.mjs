import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const sourcererModule of modules) {
  try {
    sourcererModule.createPageSource({
      load: async () => ({ items: [], totalItems: 0 }),
      pageSize: 0,
    });
    throw new Error('expected invalid configuration');
  } catch (error) {
    if (!(error instanceof sourcererModule.SourcererError)) throw new Error('SourcererError identity mismatch');
    if (!(error instanceof sourcererModule.SourcererConfigurationError)) {
      throw new Error('SourcererConfigurationError identity mismatch');
    }
    if (error.name !== 'SourcererConfigurationError') throw new Error(`unexpected error name: ${error.name}`);
  }

  const source = sourcererModule.createPageSource({
    load: async () => ({ items: [], totalItems: 0 }),
  });
  await source.reload();
  if (source.state.pagination.totalItems !== 0) throw new Error('pagination contract missing');
  if ('snapshot' in source || 'load' in source || 'updateQuery' in source || 'page' in source) {
    throw new Error('obsolete source API leaked');
  }

  source.dispose();
  try {
    await source.reload();
    throw new Error('expected disposed command to reject');
  } catch (error) {
    if (!(error instanceof sourcererModule.SourcererDisposedError)) {
      throw new Error('SourcererDisposedError identity mismatch');
    }
  }
}
