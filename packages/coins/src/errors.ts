export type CoinsErrorCode =
  | 'CURRENCY_MISMATCH'
  | 'DIVISION_BY_ZERO'
  | 'FORMAT_ERROR'
  | 'INVALID_ALLOCATION'
  | 'INVALID_CURRENCY'
  | 'INVALID_DECIMAL'
  | 'INVALID_MONEY'
  | 'INVALID_ROUNDING';

export class CoinsError extends Error {
  readonly code: CoinsErrorCode;

  constructor(code: CoinsErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CurrencyMismatchError extends CoinsError {
  readonly expected: string;
  readonly received: string;

  constructor(expected: string, received: string) {
    super('CURRENCY_MISMATCH', `Currency mismatch: ${expected} and ${received}`);
    this.expected = expected;
    this.received = received;
  }
}

export class InvalidCurrencyError extends CoinsError {
  readonly value: unknown;

  constructor(value: unknown) {
    super('INVALID_CURRENCY', `Unsupported currency: "${String(value)}"`);
    this.value = value;
  }
}
