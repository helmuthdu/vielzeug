import { decimal, roundDivision } from './_decimal';
import { isCurrency } from './currency';
import { CoinsError, CurrencyMismatchError } from './errors';
import { assertMoney, createMoney } from './money';
import type { Currency, ExchangeRate, Money, RoundingMode } from './types';

const canonicalRates = new WeakSet<object>();

export function exchangeRate<From extends Currency, To extends Currency>({
  from,
  to,
  value,
}: {
  from: From;
  to: To;
  value: string;
}): ExchangeRate<From, To> {
  if (!isCurrency(from) || !isCurrency(to))
    throw new CoinsError('INVALID_CURRENCY', 'Exchange rate requires registered currencies');

  const parsed = decimal(value);

  if (parsed.numerator < 0n) throw new CoinsError('INVALID_DECIMAL', 'Exchange rates cannot be negative');

  const rate = Object.freeze({ from, to, value: parsed }) as ExchangeRate<From, To>;

  canonicalRates.add(rate);

  return rate;
}

export function isExchangeRate(value: unknown): value is ExchangeRate {
  return typeof value === 'object' && value !== null && canonicalRates.has(value);
}

export function exchange<From extends Currency, To extends Currency>(
  value: Money<From>,
  rate: ExchangeRate<From, To>,
  options: { rounding?: RoundingMode } = {},
): Money<To> {
  assertMoney(value);

  if (!isExchangeRate(rate)) {
    throw new CoinsError('INVALID_EXCHANGE_RATE', 'Exchange requires a canonical exchange rate');
  }

  if (value.currency !== rate.from) throw new CurrencyMismatchError(value.currency.code, rate.from.code);

  const numerator = value.amount * rate.value.numerator * 10n ** BigInt(rate.to.minorUnit);
  const denominator = rate.value.denominator * 10n ** BigInt(rate.from.minorUnit);

  return createMoney(roundDivision(numerator, denominator, options.rounding ?? 'halfAwayFromZero'), rate.to);
}
