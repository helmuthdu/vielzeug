export type CoinsErrorCode =
  | 'CURRENCY_MISMATCH'
  | 'DIVISION_BY_ZERO'
  | 'FORMAT_ERROR'
  | 'INVALID_ALLOCATION'
  | 'INVALID_CURRENCY'
  | 'INVALID_DECIMAL'
  | 'INVALID_EXCHANGE_RATE'
  | 'INVALID_MONEY'
  | 'INVALID_RANGE'
  | 'INVALID_ROUNDING';

export class CoinsError extends Error {
  readonly code: CoinsErrorCode;

  constructor(code: CoinsErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = 'CoinsError';
  }
}

export function currencyMismatch(expected: string, received: string): CoinsError {
  return new CoinsError(
    'CURRENCY_MISMATCH',
    `Currency mismatch: canonical ${expected} and ${received} definitions differ`,
  );
}

export function invalidCurrency(value: unknown): CoinsError {
  return new CoinsError('INVALID_CURRENCY', `Unsupported currency: "${String(value)}"`);
}
