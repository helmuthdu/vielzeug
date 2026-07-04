/**
 * A validated ISO 4217 currency code string (e.g. `'USD'`, `'EUR'`, `'JPY'`).
 * Plain string alias — runtime validation is performed by every function that
 * accepts a currency, and violations throw `InvalidCurrencyError`.
 */
export type CurrencyCode = string;

/** A monetary value. `amount` is stored as bigint minor units (e.g. cents for USD). */
export type Money = {
  readonly amount: bigint;
  readonly currency: CurrencyCode;
};

/**
 * An exchange rate between two currencies.
 * - `from` must match the `currency` of the `Money` passed to `exchange()`.
 *   Since every `Money.currency` is already a validated ISO 4217 code, a matching
 *   `from` is implicitly valid.
 * - `to` is validated as a recognised ISO 4217 code by `exchange()` before returning.
 * - `rate` is a decimal string (e.g. `'0.847532'`) or number, for symmetry with
 *   `multiply()`/`divide()`. Prefer a string when precision matters — a number is
 *   converted via `String()` first and inherits IEEE-754 limits.
 */
export type ExchangeRate = {
  readonly from: CurrencyCode;
  readonly rate: number | string;
  readonly to: CurrencyCode;
};

/** Options for `format()`. */
export type FormatOptions = {
  locale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  style?: 'code' | 'name' | 'narrowSymbol' | 'symbol';
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
 * A single semantic part of a formatted money string, as returned by `formatParts()`.
 * Useful for custom rendering (e.g. applying different CSS to symbol, integer, fraction).
 */
export type MoneyFormatPart = {
  type: 'currency' | 'decimal' | 'fraction' | 'integer' | 'literal' | 'minusSign';
  value: string;
};
