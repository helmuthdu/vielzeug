import { isCurrency } from './currency';
import { decimal, roundDivision } from './decimal';
import { CoinsError, CurrencyMismatchError } from './errors';
import { isMoney, withMinor } from './money';
import type { Currency, ExchangeRate, Money, RoundingMode } from './types';

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

  return Object.freeze({ from, to, value: parsed });
}

export function exchange<From extends Currency, To extends Currency>(
  value: Money<From>,
  rate: ExchangeRate<From, To>,
  options: { rounding?: RoundingMode } = {},
): Money<To> {
  if (!isMoney(value) || !isValidRate(rate))
    throw new CoinsError('INVALID_MONEY', 'Exchange requires canonical money and rate values');

  if (value.currency !== rate.from) throw new CurrencyMismatchError(value.currency.code, rate.from.code);

  const numerator = value.amount * rate.value.numerator * 10n ** BigInt(rate.to.minorUnit);
  const denominator = rate.value.denominator * 10n ** BigInt(rate.from.minorUnit);

  return withMinor(roundDivision(numerator, denominator, options.rounding ?? 'halfAwayFromZero'), rate.to);
}

function isValidRate(value: unknown): value is ExchangeRate {
  if (typeof value !== 'object' || value === null || !Object.isFrozen(value)) return false;

  const rate = value as Partial<ExchangeRate>;

  return (
    isCurrency(rate.from) &&
    isCurrency(rate.to) &&
    typeof rate.value === 'object' &&
    rate.value !== null &&
    Object.isFrozen(rate.value) &&
    typeof rate.value.numerator === 'bigint' &&
    rate.value.numerator >= 0n &&
    typeof rate.value.denominator === 'bigint' &&
    rate.value.denominator > 0n
  );
}
