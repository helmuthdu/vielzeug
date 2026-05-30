import type { ExchangeRate, Money, RoundingMode } from './types';

import { absMod, applyRounding, assertValidCurrency, parseRational } from './utils';

/**
 * Converts a `Money` value to another currency using the provided exchange rate.
 * Uses lossless bigint arithmetic throughout — `rate.rate` is parsed as a decimal
 * string to avoid IEEE-754 rounding errors.
 *
 * Both `rate.from` and `rate.to` are validated against `Intl.NumberFormat`.
 *
 * @param mode Rounding mode applied when the converted amount is not a whole minor unit.
 *             Defaults to `'half-away-from-zero'`.
 *
 * @throws {Error}      If `money.currency` does not match `rate.from`.
 * @throws {RangeError} If `rate.from` or `rate.to` is not a valid ISO 4217 code.
 *
 * @example
 * ```ts
 * const usd = money('1000.00', 'USD');
 * exchange(usd, { from: 'USD', to: 'EUR', rate: '0.85' });
 * // { amount: 85000n, currency: 'EUR' }
 * ```
 */
export function exchange(m: Money, rate: ExchangeRate, mode: RoundingMode = 'half-away-from-zero'): Money {
  if (m.currency !== rate.from) {
    throw new Error(`Currency mismatch: ${m.currency} and ${rate.from}`);
  }

  // Validate the target currency and obtain a CurrencyCode for the return value.
  const toCurrency = assertValidCurrency(rate.to);
  const { denominator, negative, numerator } = parseRational(rate.rate);
  const raw = m.amount * numerator;
  const quotient = raw / denominator;
  const result = applyRounding(quotient, absMod(raw, denominator), denominator, mode, raw >= 0n);

  return { amount: negative ? -result : result, currency: toCurrency };
}
