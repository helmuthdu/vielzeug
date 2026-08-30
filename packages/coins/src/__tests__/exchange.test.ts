import { describe, expect, it } from 'vitest';

import { BHD, CoinsError, EUR, exchange, exchangeRate, isExchangeRate, JPY, money, toDecimal, USD } from '../index';

describe('exchange', () => {
  it('converts equal-scale currencies exactly', () => {
    const rate = exchangeRate({ from: USD, to: EUR, value: '0.9234' });

    expect(toDecimal(exchange(money('100.00', USD), rate))).toBe('92.34');
  });

  it('accounts for 2-to-0 and 0-to-2 currency scales', () => {
    const usdToJpy = exchangeRate({ from: USD, to: JPY, value: '150' });
    const jpyToUsd = exchangeRate({ from: JPY, to: USD, value: '0.01' });

    expect(toDecimal(exchange(money('1.00', USD), usdToJpy))).toBe('150');
    expect(toDecimal(exchange(money('100', JPY), jpyToUsd))).toBe('1.00');
  });

  it('accounts for 2-to-3 currency scales and negative values', () => {
    const usdToBhd = exchangeRate({ from: USD, to: BHD, value: '0.377' });

    expect(toDecimal(exchange(money('1.00', USD), usdToBhd))).toBe('0.377');
    expect(toDecimal(exchange(money('-1.00', USD), usdToBhd))).toBe('-0.377');
  });

  it('applies named rounding', () => {
    const half = exchangeRate({ from: USD, to: EUR, value: '0.5' });

    expect(toDecimal(exchange(money(5n, USD, { unit: 'minor' }), half, { rounding: 'halfEven' }))).toBe('0.02');
  });

  it('rejects forged rates and source mismatches', () => {
    const rate = exchangeRate({ from: USD, to: EUR, value: '1' });

    expect(() => exchange(money('1', EUR), rate as never)).toThrow(/Currency mismatch/);
    expect(() => exchangeRate({ from: USD, to: EUR, value: '-1' })).toThrow(/negative/);

    try {
      exchange(money('1', USD), Object.freeze({ ...rate }) as never);
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(CoinsError);
      expect((error as CoinsError).code).toBe('INVALID_EXCHANGE_RATE');
    }
  });

  it('isExchangeRate identifies canonical rates and rejects forgeries', () => {
    const rate = exchangeRate({ from: USD, to: EUR, value: '0.9234' });

    expect(isExchangeRate(rate)).toBe(true);
    expect(isExchangeRate(Object.freeze({ ...rate }))).toBe(false);
    expect(isExchangeRate(null)).toBe(false);
    expect(isExchangeRate({})).toBe(false);
  });
});
