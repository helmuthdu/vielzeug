import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modulePairs = [
  [await import('./dist/index.js'), await import('./dist/memory.js')],
  [require('./dist/index.cjs'), require('./dist/memory.cjs')],
];

for (const [vault, memory] of modulePairs) {
  const schema = { users: vault.table('id') };
  const store = memory.createMemory({
    codecs: {
      users: {
        parse(value) {
          if (typeof value !== 'object' || value === null || !('id' in value)) throw new Error('invalid user');
          return value;
        },
      },
    },
    schema,
  });

  await store.put('users', { id: 1, name: 'Ada' });
  if ((await store.query('users').equals('name', 'Ada').count()) !== 1) throw new Error('query export mismatch');

  await store.dispose();
  try {
    await store.get('users', 1);
    throw new Error('expected disposed operation to reject');
  } catch (error) {
    if (!(error instanceof vault.VaultError)) throw new Error('VaultError identity mismatch');
    if (!(error instanceof vault.VaultDisposedError)) throw new Error('VaultDisposedError identity mismatch');
    if (error.name !== 'VaultDisposedError') throw new Error(`unexpected error name: ${error.name}`);
  }
}
