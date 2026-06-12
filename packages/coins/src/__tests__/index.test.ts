import * as coins from '../index';

describe('index.ts public API surface', () => {
  const expectedFunctions = [
    'abs',
    'add',
    'allocate',
    'clamp',
    'compare',
    'divide',
    'exchange',
    'format',
    'formatParts',
    'fromJSON',
    'greaterThan',
    'greaterThanOrEqual',
    'isEqual',
    'isMoney',
    'isNegative',
    'isNonNegative',
    'isNonPositive',
    'isPositive',
    'isZero',
    'lessThan',
    'lessThanOrEqual',
    'max',
    'min',
    'money',
    'multiply',
    'negate',
    'percentage',
    'splitEvenly',
    'subtract',
    'sum',
    'toDecimal',
    'toCurrencyCode',
    'toJSON',
    'toNumber',
    'withAmount',
    'zero',
  ] as const;

  for (const name of expectedFunctions) {
    it(`exports ${name} as a function`, () => {
      expect(typeof (coins as Record<string, unknown>)[name]).toBe('function');
    });
  }
});
