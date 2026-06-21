export const description = 'Currency formatting and exchange utilities for monetary arithmetic.';

export const loader = () => import('@vielzeug/coins');

export const apiExports = [
  'money',
  'format',
  'formatParts',
  'exchange',
  'add',
  'subtract',
  'multiply',
  'divide',
  'allocate',
  'splitEvenly',
  'sum',
  'toDecimal',
  'toJSON',
  'fromJSON',
  'toCurrencyCode',
  'compare',
  'negate',
  'abs',
] as const;
