import { describe, expect, it } from 'vitest';

import * as coins from '../index';

describe('public API', () => {
  it('exposes the curated money model', () => {
    expect(Object.keys(coins).sort()).toEqual([
      'BHD',
      'CoinsError',
      'CurrencyMismatchError',
      'EUR',
      'GBP',
      'InvalidCurrencyError',
      'JPY',
      'KRW',
      'KWD',
      'USD',
      'abs',
      'add',
      'allocate',
      'clamp',
      'compare',
      'currency',
      'divide',
      'exchange',
      'exchangeRate',
      'format',
      'formatParts',
      'isCurrency',
      'isExchangeRate',
      'isMoney',
      'money',
      'multiply',
      'negate',
      'parseMoney',
      'parseMoneyJSON',
      'round',
      'subtract',
      'sum',
      'toDecimal',
      'toJSON',
    ]);
  });
});
