import type { Currency, Money, RoundingMode } from './types';

import { isCurrency } from './currency';
import { decimal, roundDivision, toDecimalString } from './decimal';
import { CoinsError, CurrencyMismatchError } from './errors';

const defaultRounding: RoundingMode = 'halfAwayFromZero';

export function money<C extends Currency>(amount: string, currency: C): Money<C>;
export function money<C extends Currency>(amount: string, currency: C, options: { rounding: RoundingMode }): Money<C>;
export function money<C extends Currency>(amount: bigint, currency: C, options: { unit: 'minor' }): Money<C>;
export function money<C extends Currency>(
  amount: bigint | string,
  currency: C,
  options?: { rounding: RoundingMode } | { unit: 'minor' },
): Money<C> {
  assertCurrency(currency);

  if (typeof amount === 'bigint') {
    if (!options || !('unit' in options) || options.unit !== 'minor') {
      throw new CoinsError('INVALID_MONEY', "Bigint amounts require { unit: 'minor' }");
    }

    return createMoney(amount, currency);
  }

  if (options && 'unit' in options)
    throw new CoinsError('INVALID_MONEY', 'Decimal strings do not accept a unit option');

  const value = decimal(amount);
  const scaled = value.numerator * 10n ** BigInt(currency.minorUnit);
  const remainder = scaled % value.denominator;

  if (remainder !== 0n && !options) {
    throw new CoinsError('INVALID_MONEY', `Amount "${amount}" exceeds ${currency.code} precision; provide rounding`);
  }

  return createMoney(roundDivision(scaled, value.denominator, options?.rounding ?? defaultRounding), currency);
}

export function parseMoney(value: unknown): Money {
  if (!isPlainDataObject(value)) throw new CoinsError('INVALID_MONEY', 'Money must be a plain data object');

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const amountDescriptor = descriptors.amount;
  const currencyDescriptor = descriptors.currency;

  if (!isDataProperty(amountDescriptor) || !isDataProperty(currencyDescriptor)) {
    throw new CoinsError('INVALID_MONEY', 'Money properties must be plain data values');
  }

  if (typeof amountDescriptor.value !== 'bigint' || !isCurrency(currencyDescriptor.value)) {
    throw new CoinsError('INVALID_MONEY', 'Money must contain bigint amount and a registered currency');
  }

  return createMoney(amountDescriptor.value, currencyDescriptor.value);
}

export function isMoney(value: unknown): value is Money {
  try {
    parseMoney(value);

    return true;
  } catch {
    return false;
  }
}

export function add<C extends Currency>(left: Money<C>, right: Money<NoInfer<C>>): Money<C> {
  assertSameCurrency(left, right);

  return createMoney(left.amount + right.amount, left.currency);
}

export function subtract<C extends Currency>(left: Money<C>, right: Money<NoInfer<C>>): Money<C> {
  assertSameCurrency(left, right);

  return createMoney(left.amount - right.amount, left.currency);
}

export function multiply<C extends Currency>(
  value: Money<C>,
  factor: string,
  options: { rounding?: RoundingMode } = {},
): Money<C> {
  assertMoney(value);

  const scalar = decimal(factor);

  return createMoney(
    roundDivision(value.amount * scalar.numerator, scalar.denominator, options.rounding ?? defaultRounding),
    value.currency,
  );
}

export function divide<C extends Currency>(
  value: Money<C>,
  divisor: string,
  options: { rounding?: RoundingMode } = {},
): Money<C> {
  assertMoney(value);

  const scalar = decimal(divisor);

  if (scalar.numerator === 0n) throw new CoinsError('DIVISION_BY_ZERO', 'Cannot divide money by zero');

  return createMoney(
    roundDivision(
      value.amount * scalar.denominator,
      scalar.numerator < 0n ? -scalar.numerator : scalar.numerator,
      options.rounding ?? defaultRounding,
    ) * (scalar.numerator < 0n ? -1n : 1n),
    value.currency,
  );
}

export function compare<C extends Currency>(left: Money<C>, right: Money<NoInfer<C>>): -1 | 0 | 1 {
  assertSameCurrency(left, right);

  return left.amount === right.amount ? 0 : left.amount < right.amount ? -1 : 1;
}

export function abs<C extends Currency>(value: Money<C>): Money<C> {
  assertMoney(value);

  return createMoney(value.amount < 0n ? -value.amount : value.amount, value.currency);
}

export function negate<C extends Currency>(value: Money<C>): Money<C> {
  assertMoney(value);

  return createMoney(-value.amount, value.currency);
}

export function round<C extends Currency>(
  value: Money<C>,
  options: { fractionDigits: number; rounding?: RoundingMode },
): Money<C> {
  assertMoney(value);

  const { fractionDigits, rounding = defaultRounding } = options;

  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > value.currency.minorUnit) {
    throw new CoinsError('INVALID_ROUNDING', `fractionDigits must be an integer from 0 to ${value.currency.minorUnit}`);
  }

  const factor = 10n ** BigInt(value.currency.minorUnit - fractionDigits);

  return createMoney(roundDivision(value.amount, factor, rounding) * factor, value.currency);
}

export function toDecimal(value: Money): string {
  assertMoney(value);

  return toDecimalString(value.amount, value.currency.minorUnit);
}

export function withMinor<C extends Currency>(amount: bigint, currency: C): Money<C> {
  assertCurrency(currency);

  return createMoney(amount, currency);
}

function createMoney<C extends Currency>(amount: bigint, currency: C): Money<C> {
  return Object.freeze({ amount, currency }) as Money<C>;
}

function assertMoney(value: Money): void {
  if (!Object.isFrozen(value) || !isCurrency(value.currency)) {
    throw new CoinsError('INVALID_MONEY', 'Money must be a canonical Coins value');
  }
}

function assertSameCurrency(left: Money, right: Money): void {
  assertMoney(left);
  assertMoney(right);

  if (left.currency !== right.currency) {
    throw new CurrencyMismatchError(left.currency.code, right.currency.code);
  }
}

function assertCurrency(value: Currency): void {
  if (!isCurrency(value)) throw new CoinsError('INVALID_CURRENCY', 'Money requires a registered currency');
}

function isPlainDataObject(value: unknown): value is Record<PropertyKey, unknown> {
  if (typeof value !== 'object' || value === null) return false;

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function isDataProperty(
  descriptor: PropertyDescriptor | undefined,
): descriptor is PropertyDescriptor & { value: unknown } {
  return (
    descriptor !== undefined && 'value' in descriptor && descriptor.get === undefined && descriptor.set === undefined
  );
}
