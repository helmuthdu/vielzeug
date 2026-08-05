import type { Currency, Money } from './types';

import { decimal, lcm } from './decimal';
import { CoinsError, CurrencyMismatchError } from './errors';
import { compare, isMoney, withMinor } from './money';

export function sum<C extends Currency>(values: Iterable<Money<C>>, options: { currency: C }): Money<C> {
  let amount = 0n;

  for (const value of values) {
    if (!isMoney(value)) throw new CoinsError('INVALID_MONEY', 'sum() requires canonical money values');

    if (value.currency !== options.currency)
      throw new CurrencyMismatchError(options.currency.code, value.currency.code);

    amount += value.amount;
  }

  return withMinor(amount, options.currency);
}

export function allocate<C extends Currency>(value: Money<C>, count: number): Money<C>[];
export function allocate<C extends Currency>(value: Money<C>, weights: readonly string[]): Money<C>[];
export function allocate<C extends Currency>(value: Money<C>, weightsOrCount: number | readonly string[]): Money<C>[] {
  if (!isMoney(value)) throw new CoinsError('INVALID_MONEY', 'allocate() requires canonical money');

  if (typeof weightsOrCount === 'number') return allocateEvenly(value, weightsOrCount);

  if (weightsOrCount.length === 0) throw new CoinsError('INVALID_ALLOCATION', 'Allocation weights cannot be empty');

  const weights = weightsOrCount.map(decimal);

  if (weights.some((weight) => weight.numerator < 0n)) {
    throw new CoinsError('INVALID_ALLOCATION', 'Allocation weights cannot be negative');
  }

  const commonDenominator = weights.reduce((result, weight) => lcm(result, weight.denominator), 1n);
  const scaledWeights = weights.map((weight) => weight.numerator * (commonDenominator / weight.denominator));
  const totalWeight = scaledWeights.reduce((result, weight) => result + weight, 0n);

  if (totalWeight === 0n)
    throw new CoinsError('INVALID_ALLOCATION', 'Allocation weights must include a positive value');

  const sign = value.amount < 0n ? -1n : 1n;
  const absolute = value.amount < 0n ? -value.amount : value.amount;
  const shares = scaledWeights.map((weight) => (absolute * weight) / totalWeight);
  let remainder = absolute - shares.reduce((result, amount) => result + amount, 0n);
  const ranked = scaledWeights
    .map((weight, index) => ({ index, remainder: (absolute * weight) % totalWeight }))
    .sort((left, right) =>
      left.remainder === right.remainder ? left.index - right.index : left.remainder > right.remainder ? -1 : 1,
    );

  for (const entry of ranked) {
    if (remainder === 0n) break;

    shares[entry.index]! += 1n;
    remainder -= 1n;
  }

  return shares.map((amount) => withMinor(amount * sign, value.currency));
}

export function clamp<C extends Currency>(
  value: Money<C>,
  options: { max: Money<NoInfer<C>>; min: Money<NoInfer<C>> },
): Money<C> {
  if (compare(options.min, options.max) === 1) {
    throw new CoinsError('INVALID_ALLOCATION', 'Clamp minimum cannot exceed maximum');
  }

  return compare(value, options.min) === -1 ? options.min : compare(value, options.max) === 1 ? options.max : value;
}

function allocateEvenly<C extends Currency>(value: Money<C>, countValue: number): Money<C>[] {
  if (!Number.isInteger(countValue) || countValue < 1) {
    throw new CoinsError('INVALID_ALLOCATION', 'Allocation count must be a positive integer');
  }

  const count = BigInt(countValue);
  const sign = value.amount < 0n ? -1n : 1n;
  const absolute = value.amount < 0n ? -value.amount : value.amount;
  const base = absolute / count;
  const remainder = absolute % count;

  return Array.from({ length: countValue }, (_, index) =>
    withMinor((base + (BigInt(index) < remainder ? 1n : 0n)) * sign, value.currency),
  );
}
