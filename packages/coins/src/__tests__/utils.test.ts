import { describe, expect, it } from 'vitest';

import {
  allocate,
  BHD,
  CoinsError,
  clamp,
  currency,
  decodeMoney,
  EUR,
  isCurrency,
  KRW,
  KWD,
  money,
  sum,
  toDecimal,
  toJSON,
  USD,
} from '../index';

describe('currency definitions', () => {
  it('resolves immutable built-ins and rejects unknown codes', () => {
    expect(currency('USD')).toBe(USD);
    expect(currency('BHD')).toBe(BHD);
    expect(currency('KRW')).toBe(KRW);
    expect(currency('KWD')).toBe(KWD);
    expect(Object.isFrozen(USD)).toBe(true);
    expect(() => currency('FAKE')).toThrow(/Unsupported currency/);
  });

  it('constructs immutable custom currencies from definitions', () => {
    const points = currency({ code: 'PTS', minorUnit: 0 });

    expect(toDecimal(money('10', points))).toBe('10');
    expect(Object.isFrozen(points)).toBe(true);
    expect(currency({ code: 'PTS', minorUnit: 0 })).not.toBe(points);
    expect(() => currency({ code: 'lower', minorUnit: 0 })).toThrow(/uppercase/);
    expect(() => currency(null as never)).toThrow(expect.objectContaining({ code: 'INVALID_CURRENCY' }));
  });

  it('isCurrency identifies canonical currencies and rejects forgeries', () => {
    expect(isCurrency(USD)).toBe(true);
    expect(isCurrency(currency({ code: 'PTS', minorUnit: 0 }))).toBe(true);
    expect(isCurrency(Object.freeze({ code: 'USD', minorUnit: 2 }))).toBe(false);
    expect(isCurrency(null)).toBe(false);
    expect(isCurrency({})).toBe(false);
  });
});

describe('aggregation', () => {
  it('returns currency-aware zero for empty values with explicit currency', () => {
    expect(sum([], { currency: USD })).toMatchObject({ amount: 0n, currency: USD });
  });

  it('infers currency from non-empty values', () => {
    expect(sum([money('1', USD), money('2', USD)])).toMatchObject({ amount: 300n, currency: USD });
  });

  it('throws on empty iterable without currency', () => {
    expect(() => sum([])).toThrow(/empty/);
  });

  it('allocates every minor unit exactly and sign-symmetrically', () => {
    const positive = allocate(money(7n, USD, { unit: 'minor' }), ['1', '2', '1']);
    const negative = allocate(money(-7n, USD, { unit: 'minor' }), ['1', '2', '1']);

    expect(positive.map((value) => value.amount)).toEqual([2n, 3n, 2n]);
    expect(negative.map((value) => value.amount)).toEqual([-2n, -3n, -2n]);
    expect(sum(negative).amount).toBe(-7n);
  });

  it('conserves signed minor units across varied weighted allocations', () => {
    for (let amount = -50n; amount <= 50n; amount++) {
      const value = money(amount, USD, { unit: 'minor' });
      const parts = allocate(value, ['1', '2.5', '0', '3']);

      expect(parts.reduce((total, part) => total + part.amount, 0n)).toBe(amount);
    }
  });

  it('uses count allocation and explicit clamp bounds', () => {
    expect(allocate(money(5n, USD, { unit: 'minor' }), 2).map((part) => part.amount)).toEqual([3n, 2n]);
    expect(allocate(money(-5n, USD, { unit: 'minor' }), 2).map((part) => part.amount)).toEqual([-3n, -2n]);
    expect(toDecimal(clamp(money('12', USD), { max: money('10', USD), min: money('0', USD) }))).toBe('10.00');
  });

  it('rejects clamp min exceeding max with INVALID_RANGE', () => {
    try {
      clamp(money('5', USD), { max: money('0', USD), min: money('10', USD) });
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(CoinsError);
      expect((error as CoinsError).code).toBe('INVALID_RANGE');
    }
  });

  it('rejects forged empty-sum currencies and invalid allocation shapes', () => {
    const forged = Object.freeze({ code: 'USD', minorUnit: 2 });
    const sparse: string[] = [];

    sparse.length = 2;
    sparse[1] = '1';

    expect(() => sum([], { currency: forged as never })).toThrow(expect.objectContaining({ code: 'INVALID_CURRENCY' }));
    expect(() => allocate(money('1', USD), sparse)).toThrow(expect.objectContaining({ code: 'INVALID_ALLOCATION' }));
    expect(() => allocate(money('1', USD), 4_294_967_296)).toThrow(
      expect.objectContaining({ code: 'INVALID_ALLOCATION' }),
    );
  });

  it('rejects mixed-currency aggregates', () => {
    expect(() => sum([money('1', USD), money('1', EUR) as never])).toThrow(/Currency mismatch/);
  });
});

describe('serialization', () => {
  it('round-trips canonical built-in JSON', () => {
    expect(decodeMoney(toJSON(money('19.99', USD)))).toMatchObject({ amount: 1999n, currency: USD });
  });

  it.each(['1.5', 'abc', '1e3'])('rejects non-integer amount strings %j', (amount) => {
    expect(() => decodeMoney({ amount, currency: 'USD', unit: 'minor' })).toThrow(/Invalid Money JSON/);
  });

  it.each(['+1', '01', '-0', ' 1'])('rejects non-canonical integer amount strings %j', (amount) => {
    expect(() => decodeMoney({ amount, currency: 'USD', unit: 'minor' })).toThrow(/Invalid Money JSON/);
  });

  it('rejects MoneyJSON objects with extra properties', () => {
    expect(() => decodeMoney({ amount: '1', currency: 'USD', extra: true, unit: 'minor' })).toThrow(/exactly the keys/);
  });

  it('rejects accessor properties', () => {
    const input = { currency: 'USD', unit: 'minor' };

    Object.defineProperty(input, 'amount', { enumerable: true, get: () => '1' });
    expect(() => decodeMoney(input)).toThrow();
  });

  it('rejects contradictory plain-money envelopes and resolver substitutions', () => {
    expect(() => decodeMoney({ amount: 1n, currency: USD, unit: 'major' })).toThrow(/exactly/);
    expect(() => decodeMoney({ amount: 1n, currency: USD, extra: true })).toThrow(/exactly/);
    expect(() => decodeMoney({ amount: '100', currency: 'USD', unit: 'minor' }, { currency: () => EUR })).toThrow(
      /USD/,
    );
  });

  it('bounds serialized integer input', () => {
    expect(() => decodeMoney({ amount: '9'.repeat(1001), currency: 'USD', unit: 'minor' })).toThrow(/too long/);
  });

  it('restores custom currency only through explicit resolver', () => {
    const tokens = currency({ code: 'TOK', minorUnit: 2 });
    const encoded = toJSON(money('1.00', tokens));

    expect(() => decodeMoney(encoded)).toThrow();
    expect(decodeMoney(encoded, { currency: (code) => (code === 'TOK' ? tokens : currency(code)) })).toMatchObject({
      amount: 100n,
      currency: tokens,
    });
  });
});
