import { describe, expect, it } from 'vitest';

import {
  EUR,
  USD,
  allocate,
  clamp,
  currency,
  defineCurrency,
  money,
  parseMoneyJSON,
  sum,
  toDecimal,
  toJSON,
} from '../index';

describe('currency definitions', () => {
  it('resolves immutable built-ins and rejects unknown codes', () => {
    expect(currency('USD')).toBe(USD);
    expect(Object.isFrozen(USD)).toBe(true);
    expect(() => currency('FAKE')).toThrow(/Unsupported currency/);
  });

  it('registers one deterministic custom definition', () => {
    const points = defineCurrency({ code: 'PTS', minorUnit: 0 });

    expect(toDecimal(money('10', points))).toBe('10');
    expect(defineCurrency({ code: 'PTS', minorUnit: 0 })).toBe(points);
    expect(() => defineCurrency({ code: 'PTS', minorUnit: 2 })).toThrow(/already has/);
  });
});

describe('aggregation', () => {
  it('returns currency-aware zero for empty values', () => {
    expect(sum([], { currency: USD })).toMatchObject({ amount: 0n, currency: USD });
  });

  it('allocates every minor unit exactly and sign-symmetrically', () => {
    const positive = allocate(money(7n, USD, { unit: 'minor' }), ['1', '2', '1']);
    const negative = allocate(money(-7n, USD, { unit: 'minor' }), ['1', '2', '1']);

    expect(positive.map((value) => value.amount)).toEqual([2n, 3n, 2n]);
    expect(negative.map((value) => value.amount)).toEqual([-2n, -3n, -2n]);
    expect(sum(negative, { currency: USD }).amount).toBe(-7n);
  });

  it('uses count allocation and explicit clamp bounds', () => {
    expect(allocate(money(5n, USD, { unit: 'minor' }), 2).map((part) => part.amount)).toEqual([3n, 2n]);
    expect(allocate(money(-5n, USD, { unit: 'minor' }), 2).map((part) => part.amount)).toEqual([-3n, -2n]);
    expect(toDecimal(clamp(money('12', USD), { max: money('10', USD), min: money('0', USD) }))).toBe('10.00');
  });

  it('rejects mixed-currency aggregates', () => {
    expect(() => sum([money('1', USD), money('1', EUR) as never], { currency: USD })).toThrow(/Currency mismatch/);
  });
});

describe('serialization', () => {
  it('round-trips canonical built-in JSON', () => {
    expect(parseMoneyJSON(toJSON(money('19.99', USD)))).toMatchObject({ amount: 1999n, currency: USD });
  });

  it.each(['', ' ', '+1', '01', '-0', ' 1'])('rejects non-canonical amount %j', (amount) => {
    expect(() => parseMoneyJSON({ amount, currency: 'USD', unit: 'minor' })).toThrow(/Invalid Money JSON/);
  });

  it('rejects unknown fields and accessor properties', () => {
    expect(() => parseMoneyJSON({ amount: '1', currency: 'USD', extra: true, unit: 'minor' })).toThrow();

    const input = { currency: 'USD', unit: 'minor' };

    Object.defineProperty(input, 'amount', { enumerable: true, get: () => '1' });
    expect(() => parseMoneyJSON(input)).toThrow();
  });

  it('restores custom currency only through explicit resolver', () => {
    const tokens = defineCurrency({ code: 'TOK', minorUnit: 2 });
    const encoded = toJSON(money('1.00', tokens));

    expect(() => parseMoneyJSON(encoded)).toThrow();
    expect(parseMoneyJSON(encoded, { currency: (code) => (code === 'TOK' ? tokens : currency(code)) })).toMatchObject({
      amount: 100n,
      currency: tokens,
    });
  });
});
