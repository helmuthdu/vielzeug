declare const __currencyBrand: unique symbol;

/**
 * A validated ISO 4217 currency code (e.g. `'USD'`, `'EUR'`, `'JPY'`).
 *
 * Obtain one via the `toCurrencyCode()` factory, which validates the code against
 * `Intl.NumberFormat`. Using a branded type ensures only validated codes can
 * appear as currency identifiers in `Money` and `ExchangeRate` objects — unvalidated
 * plain strings are rejected by the type system at call sites.
 *
 * @example
 * ```ts
 * const usd = toCurrencyCode('USD');  // CurrencyCode
 * money('100.00', usd);               // Money with validated currency
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
 * Both `from` and `to` must be validated `CurrencyCode` values — use `toCurrencyCode()`
 * to produce them from plain strings.
 * `rate` is a decimal string (e.g. `'0.847532'`) for lossless bigint precision.
 */
export type ExchangeRate = {
  readonly from: CurrencyCode;
  readonly rate: string;
  readonly to: CurrencyCode;
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
 * A single semantic part of a formatted money string, as returned by `formatParts()`.
 * Useful for custom rendering (e.g. applying different CSS to symbol, integer, fraction).
 */
export type MoneyFormatPart = {
  type: 'currency' | 'decimal' | 'fraction' | 'integer' | 'literal' | 'minusSign';
  value: string;
};
