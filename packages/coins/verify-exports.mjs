import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const coins of modules) {
  for (const name of ['BHD', 'KRW', 'KWD', 'decodeMoney', 'toDecimalString']) {
    if (!(name in coins)) throw new Error(`missing export: ${name}`);
  }

  const error = new coins.CoinsError('INVALID_MONEY', 'invalid');

  if (!(error instanceof Error) || error.name !== 'CoinsError' || error.code !== 'INVALID_MONEY') {
    throw new Error('CoinsError identity mismatch');
  }
}
