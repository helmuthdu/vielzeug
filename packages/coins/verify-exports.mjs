import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const coins of modules) {
  for (const name of ['BHD', 'KRW', 'KWD', 'decodeMoney']) {
    if (!(name in coins)) throw new Error(`missing export: ${name}`);
  }

  const errors = [
    ['CoinsError', new coins.CoinsError('INVALID_MONEY', 'invalid')],
    ['CurrencyMismatchError', new coins.CurrencyMismatchError('USD', 'EUR')],
    ['InvalidCurrencyError', new coins.InvalidCurrencyError('BAD')],
  ];

  for (const [name, error] of errors) {
    if (!(error instanceof coins.CoinsError)) throw new Error('CoinsError identity mismatch');
    if (error.name !== name) throw new Error(`unexpected error name: ${error.name}`);
  }
}
