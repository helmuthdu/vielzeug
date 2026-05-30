declare const __currencyBrand: unique symbol;

/**
 * A validated ISO 4217 currency code (e.g. `'USD'`, `'EUR'`, `'JPY'`).
 *
 * Obtain one via the `currency()` factory, which validates the code against
 * `Intl.NumberFormat`. Using a branded type ensures only validated codes can
 * appear as currency identifiers in `Money` objects — unvalidated plain strings
 * are rejected by the type system at call sites.
 *
 * @example
 * ```ts
 * const usd = currency('USD');  // CurrencyCode
 * money('100.00', usd);         // Money with validated currency
 * ```
 */
export type CurrencyCode = string & { readonly [__currencyBrand]: true };

/** A monetary value. `amount` is stored as bigint minor units (e.g. cents for USD). */
export type Money = {
  readonly amount: bigint;
  readonly currency: CurrencyCode;
};

/**
 * An exchange rate between two currencies.
 * `rate` is a decimal string (e.g. `'0.847532'`) for lossless precision.
 * Both `from` and `to` are validated at `exchange()` call time.
 */
export type ExchangeRate = {
  readonly from: string;
  readonly rate: string;
  readonly to: string;
};

/** Options for `format()`. */
export type FormatOptions = {
  locale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  style?: 'code' | 'name' | 'symbol';
};

/**
 * Rounding mode for operations that produce fractional minor units.
 *
 * | Mode | Description |
 * |---|---|
 * | `'ceiling'` | Toward +∞ (up for positives, truncate for negatives) |
 * | `'down'` | Toward zero (truncate, regardless of sign) |
 * | `'floor'` | Toward −∞ (truncate for positives, down for negatives) |
 * | `'half-away-from-zero'` | Round half away from zero (default, common in finance) |
 * | `'half-even'` | Round half to even (banker's rounding, minimises cumulative error) |
 * | `'up'` | Away from zero (regardless of sign) |
 */
export type RoundingMode = 'ceiling' | 'down' | 'floor' | 'half-away-from-zero' | 'half-even' | 'up';

/** JSON-safe representation of `Money`. `amount` is a decimal integer string to avoid bigint serialization issues. */
export type MoneyJSON = {
  amount: string;
  currency: string;
};

/**
 * An exchange rate between two currencies.
 * `rate` is a decimal string (e.g. `'0.847532'`) for lossless precision.
 * Using a string avoids the IEEE-754 rounding that a `number` would introduce.
 */
export type ExchangeRate = {
  readonly from: string;
  readonly rate: string;
  readonly to: string;
};

/** Options for `format()`. */
export type FormatOptions = {
  locale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  style?: 'code' | 'name' | 'symbol';
};

/**
 * Rounding mode for operations that produce fractional minor units.
 *
 * | Mode | Description |
 * |---|---|
 * | `'ceiling'` | Toward +∞ (up for positives, truncate for negatives) |
 * | `'down'` | Toward zero (truncate, regardless of sign) |
 * | `'floor'` | Toward −∞ (truncate for positives, down for negatives) |
 * | `'half-away-from-zero'` | Round half away from zero (default, common in finance) |
 * | `'half-even'` | Round half to even (banker's rounding, minimises cumulative error) |
 * | `'up'` | Away from zero (regardless of sign) |
 */
export type RoundingMode = 'ceiling' | 'down' | 'floor' | 'half-away-from-zero' | 'half-even' | 'up';

/** JSON-safe representation of `Money`. `amount` is a decimal integer string to avoid bigint serialization issues. */
export type MoneyJSON = {
  amount: string;
  currency: string;
};
