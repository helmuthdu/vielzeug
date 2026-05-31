import type { ExchangeRate, Money, RoundingMode } from './types';

import { applyRounding, parseRational } from './utils';

/**
 * Converts a `Money` value to another currency using the provided exchange rate.
 * Uses lossless bigint arithmetic throughout — `rate.rate` is parsed as a decimal
 * string to avoid IEEE-754 rounding errors.
 *
 * `rate.from` and `rate.to` must be `CurrencyCode` values (produced by `toCurrencyCode()`).
 * The TypeScript type system prevents passing an unvalidated string directly.
 *
 * @param mode Rounding mode applied when the converted amount is not a whole minor unit.
 *             Defaults to `'half-away-from-zero'`.
 *
 * @throws {TypeError}  If `money.currency` does not match `rate.from` (programming error).
 *
 * @example
 * ```ts
 * const usd = money('1000.00', 'USD');
 * exchange(usd, { from: toCurrencyCode('USD'), to: toCurrencyCode('EUR'), rate: '0.85' });
 * // { amount: 85000n, currency: 'EUR' }
 * ```
 */
export function exchange(m: Money, rate: ExchangeRate, mode: RoundingMode = 'half-away-from-zero'): Money {
  if (m.currency !== rate.from) {
    throw new TypeError(`Currency mismatch: ${m.currency} and ${rate.from}`);
  }

  const { denominator, negative: rateNegative, numerator } = parseRational(rate.rate);
  const negative = m.amount < 0n !== rateNegative;
  const absAmount = m.amount < 0n ? -m.amount : m.amount;
  const raw = absAmount * numerator;
  const quotient = raw / denominator;
  const result = applyRounding(quotient, raw % denominator, denominator, mode, negative);

  return { amount: negative ? -result : result, currency: rate.to };
}
