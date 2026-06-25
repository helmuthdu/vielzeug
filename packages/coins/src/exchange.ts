import type { ExchangeRate, Money, RoundingMode } from './types';

import { CoinsError, CurrencyMismatchError } from './errors';
import { applyRounding, parseRational, validateCurrencyCode } from './utils';

/**
 * Converts a `Money` value to another currency using the provided exchange rate.
 * Uses lossless bigint arithmetic throughout — `rate.rate` is parsed as a decimal
 * string to avoid IEEE-754 rounding errors.
 *
 * @param mode Rounding mode applied when the converted amount is not a whole minor unit.
 *             Defaults to `'half-away-from-zero'`.
 *
 * @throws {CurrencyMismatchError} If `money.currency` does not match `rate.from`.
 *   Note: `rate.from` is validated implicitly — because `money.currency` is always a valid ISO 4217
 *   code (enforced by `money()`), the mismatch check ensures `rate.from` must equal a valid code.
 *   If you supply an invalid code in `rate.from`, you will receive `CurrencyMismatchError`, not
 *   `InvalidCurrencyError`. Pre-validate `rate.from` with `validateCurrencyCode()` if needed.
 * @throws {InvalidCurrencyError}  If `rate.to` is not a recognised ISO 4217 currency code.
 * @throws {RangeError}            If `rate.rate` is an empty string or a negative value.
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
    throw new CurrencyMismatchError(m.currency, rate.from);
  }

  if (rate.rate === '') throw new CoinsError('Exchange rate must be a non-empty decimal string');

  const { denominator, negative: rateNegative, numerator } = parseRational(rate.rate);

  if (rateNegative) throw new CoinsError('Exchange rate must be non-negative');

  const negative = m.amount < 0n;
  const absAmount = m.amount < 0n ? -m.amount : m.amount;
  const raw = absAmount * numerator;
  const quotient = raw / denominator;
  const result = applyRounding(quotient, raw % denominator, denominator, mode, negative);

  return { amount: negative ? -result : result, currency: validateCurrencyCode(rate.to) };
}
