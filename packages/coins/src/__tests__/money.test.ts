import { describe, expect, it } from 'vitest';

import {
  EUR,
  JPY,
  USD,
  CoinsError,
  add,
  compare,
  decimal,
  divide,
  money,
  multiply,
  parseMoney,
  round,
  subtract,
  toDecimal,
} from '../index';

describe('money', () => {
  it('constructs exact decimal and explicit minor-unit values', () => {
    expect(money('19.99', USD)).toMatchObject({ amount: 1999n, currency: USD });
    expect(money(1999n, USD, { unit: 'minor' })).toMatchObject({ amount: 1999n, currency: USD });
    expect(money('19', JPY)).toMatchObject({ amount: 19n, currency: JPY });
  });

  it('rejects ambiguous bigint and over-precise decimal construction', () => {
    expect(() => money(1999n as never, USD)).toThrow(/unit/);
    expect(() => money('19.999', USD)).toThrow(/provide rounding/);
    expect(toDecimal(money('19.999', USD, { rounding: 'halfAwayFromZero' }))).toBe('20.00');
    expect(toDecimal(money('-0.005', USD, { rounding: 'halfEven' }))).toBe('0.00');
  });

  it('preserves currency through arithmetic and all directed signs', () => {
    const subtotal = add(money('10.00', USD), money('2.50', USD));

    expect(toDecimal(subtract(subtotal, money('0.50', USD)))).toBe('12.00');
    expect(toDecimal(multiply(subtotal, '1.08'))).toBe('13.50');
    expect(toDecimal(divide(subtotal, '2'))).toBe('6.25');
    expect(toDecimal(divide(money('-0.05', USD), '2', { rounding: 'floor' }))).toBe('-0.03');
    expect(toDecimal(divide(money('-0.05', USD), '2', { rounding: 'ceil' }))).toBe('-0.02');
  });

  it('uses named rounding policy', () => {
    const value = money('1.55', USD);

    expect(toDecimal(round(value, { fractionDigits: 1, rounding: 'halfEven' }))).toBe('1.60');
    expect(toDecimal(round(value, { fractionDigits: 1, rounding: 'towardZero' }))).toBe('1.50');
  });

  it('compares canonical matching currencies and rejects forged values', () => {
    expect(compare(money('1', USD), money('2', USD))).toBe(-1);
    expect(() => compare(money('1', USD), money('1', EUR) as never)).toThrow(/Currency mismatch/);
    expect(() => add(money('1', USD), { amount: 100n, currency: USD } as never)).toThrow(/canonical/);
  });

  it('normalizes and bounds exact decimals', () => {
    expect(decimal('1.0750')).toMatchObject({ denominator: 40n, numerator: 43n });
    expect(decimal('-0.00')).toMatchObject({ denominator: 1n, numerator: 0n });
    expect(() => decimal('1e3')).toThrow(/Invalid decimal/);
    expect(() => decimal(`0.${'1'.repeat(101)}`)).toThrow(/precision/);
    expect(() => decimal('1'.repeat(1001))).toThrow(/too long/);
  });

  it('canonicalizes parsed values and rejects accessors', () => {
    const parsed = parseMoney({ amount: 1n, currency: USD });

    expect(Object.isFrozen(parsed)).toBe(true);
    expect(() => parseMoney(Object.defineProperty({ currency: USD }, 'amount', { get: () => 1n }))).toThrow(/data/);
    expect(CoinsError.is(new CoinsError('INVALID_MONEY', 'bad'))).toBe(true);
  });
});
