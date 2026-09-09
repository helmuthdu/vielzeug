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
  protected static readonly errorName: string = 'CoinsError';
  readonly code: CoinsErrorCode;

  constructor(code: CoinsErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = (new.target as typeof CoinsError).errorName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CurrencyMismatchError extends CoinsError {
  protected static override readonly errorName = 'CurrencyMismatchError';
  readonly expected: string;
  readonly received: string;

  constructor(expected: string, received: string) {
    super('CURRENCY_MISMATCH', `Currency mismatch: canonical ${expected} and ${received} definitions differ`);
    this.expected = expected;
    this.received = received;
  }
}

function describe(value: unknown): string {
  try {
    return String(value);
  } catch {
    return '<unprintable>';
  }
}

export class InvalidCurrencyError extends CoinsError {
  protected static override readonly errorName = 'InvalidCurrencyError';
  readonly value: unknown;

  constructor(value: unknown) {
    super('INVALID_CURRENCY', `Unsupported currency: "${describe(value)}"`);
    this.value = value;
  }
}
