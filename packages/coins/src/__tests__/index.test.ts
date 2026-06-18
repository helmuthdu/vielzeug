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
    'getCurrencyDecimals',
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
    'roundTo',
    'splitEvenly',
    'subtract',
    'sum',
    'toDecimal',
    'toJSON',
    'toNumber',
    'validateCurrencyCode',
    'withAmount',
  ] as const;

  const expectedClasses = ['CurrencyMismatchError', 'InvalidCurrencyError'] as const;

  for (const name of expectedClasses) {
    it(`exports ${name} as a class`, () => {
      expect(typeof (coins as Record<string, unknown>)[name]).toBe('function');
      expect((coins as Record<string, unknown>)[name]).toHaveProperty('prototype');
    });
  }

  for (const name of expectedFunctions) {
    it(`exports ${name} as a function`, () => {
      expect(typeof (coins as Record<string, unknown>)[name]).toBe('function');
    });
  }
});
