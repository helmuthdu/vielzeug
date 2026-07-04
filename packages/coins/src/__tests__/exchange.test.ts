import type { ExchangeRate } from '../types';

import { CoinsError, CurrencyMismatchError, InvalidCurrencyError } from '../errors';
import { exchange } from '../exchange';
import { money } from '../money';

describe('exchange', () => {
  describe('basic conversion', () => {
    it('converts USD to EUR', () => {
      const result = exchange(money('1000.00', 'USD'), { from: 'USD', rate: '0.85', to: 'EUR' });

      expect(result).toEqual({ amount: 85000n, currency: 'EUR' });
    });

    it('converts EUR to USD', () => {
      const result = exchange(money('850.00', 'EUR'), { from: 'EUR', rate: '1.18', to: 'USD' });

      expect(result).toEqual({ amount: 100300n, currency: 'USD' });
    });

    it('handles zero amount', () => {
      const result = exchange(money('0.00', 'USD'), { from: 'USD', rate: '0.85', to: 'EUR' });

      expect(result).toEqual({ amount: 0n, currency: 'EUR' });
    });

    it('rate of 1.0 produces identical amount', () => {
      const result = exchange(money('1000.00', 'USD'), { from: 'USD', rate: '1.0', to: 'USD' });

      expect(result).toEqual({ amount: 100000n, currency: 'USD' });
    });

    it('rate of 0 produces zero amount', () => {
      const result = exchange(money('1000.00', 'USD'), { from: 'USD', rate: '0', to: 'EUR' });

      expect(result).toEqual({ amount: 0n, currency: 'EUR' });
    });
  });

  describe('precision', () => {
    it('handles high exchange rates (USD → JPY)', () => {
      const result = exchange(money('100.00', 'USD'), { from: 'USD', rate: '110.0', to: 'JPY' });

      // 10000 minor units × 1100 / 10 = 1100000
      expect(result).toEqual({ amount: 1100000n, currency: 'JPY' });
    });

    it('handles low exchange rates (JPY → USD)', () => {
      const result = exchange(money(1000000n, 'JPY'), { from: 'JPY', rate: '0.0091', to: 'USD' });

      // 1000000 × 91 / 10000 = 9100
      expect(result).toEqual({ amount: 9100n, currency: 'USD' });
    });

    it('converts with many significant digits without float error', () => {
      // 0.847532 as float64 is not representable exactly; string parsing avoids this
      const result = exchange(money('1000.00', 'USD'), { from: 'USD', rate: '0.847532', to: 'EUR' });

      // 100000 × 847532 / 1000000 = 84753.2 → rounds to 84753
      expect(result).toEqual({ amount: 84753n, currency: 'EUR' });
    });

    it('accepts a rate string in scientific notation', () => {
      // ExchangeRate.rate is a string — scientific notation should be handled
      const result = exchange(money('1000.00', 'USD'), { from: 'USD', rate: '1e-2', to: 'EUR' });

      // 100000 × 1 / 100 = 1000 EUR cents = €10.00
      expect(result).toEqual({ amount: 1000n, currency: 'EUR' });
    });
  });

  describe('number rate', () => {
    it('accepts a rate as a number, for symmetry with multiply()/divide()', () => {
      const result = exchange(money('1000.00', 'USD'), { from: 'USD', rate: 0.85, to: 'EUR' });

      expect(result).toEqual({ amount: 85000n, currency: 'EUR' });
    });

    it('throws CoinsError for a negative number rate', () => {
      expect(() => exchange(money('100.00', 'USD'), { from: 'USD', rate: -0.85, to: 'EUR' })).toThrow(CoinsError);
    });

    it('throws CoinsError for a NaN rate', () => {
      expect(() => exchange(money('100.00', 'USD'), { from: 'USD', rate: NaN, to: 'EUR' })).toThrow(CoinsError);
    });
  });

  describe('rounding modes', () => {
    // 3 cents × 0.5 = 1.5 cents — a fractional minor unit
    const threeUsd: ExchangeRate = { from: 'USD', rate: '0.5', to: 'EUR' };

    it("'half-away-from-zero' rounds 1.5 up to 2 (default)", () => {
      expect(exchange(money(3n, 'USD'), threeUsd)).toEqual({ amount: 2n, currency: 'EUR' });
    });

    it("'down' truncates 1.5 to 1", () => {
      expect(exchange(money(3n, 'USD'), threeUsd, 'down')).toEqual({ amount: 1n, currency: 'EUR' });
    });

    it("'up' rounds 1.5 to 2", () => {
      expect(exchange(money(3n, 'USD'), threeUsd, 'up')).toEqual({ amount: 2n, currency: 'EUR' });
    });

    it("'floor' rounds 1.5 to 1 for positive amounts", () => {
      expect(exchange(money(3n, 'USD'), threeUsd, 'floor')).toEqual({ amount: 1n, currency: 'EUR' });
    });

    it("'ceiling' rounds 1.5 to 2 for positive amounts", () => {
      expect(exchange(money(3n, 'USD'), threeUsd, 'ceiling')).toEqual({
        amount: 2n,
        currency: 'EUR',
      });
    });

    it("'half-even' rounds to nearest even: 1.5 → 2 (even), 2.5 → 2 (even)", () => {
      // 3 cents × 0.5 = 1.5 → nearest even = 2
      expect(exchange(money(3n, 'USD'), threeUsd, 'half-even')).toEqual({
        amount: 2n,
        currency: 'EUR',
      });

      // 5 cents × 0.5 = 2.5 → nearest even = 2
      expect(exchange(money(5n, 'USD'), threeUsd, 'half-even')).toEqual({
        amount: 2n,
        currency: 'EUR',
      });
    });
  });

  describe('zero rate', () => {
    it('converts any amount to zero when rate is "0"', () => {
      // rate='0' is a valid non-negative decimal; result is always 0 minor units
      const rate: ExchangeRate = { from: 'USD', rate: '0', to: 'EUR' };

      expect(exchange(money('100.00', 'USD'), rate)).toEqual({ amount: 0n, currency: 'EUR' });
      expect(exchange(money('-100.00', 'USD'), rate)).toEqual({ amount: 0n, currency: 'EUR' });
    });
  });

  describe('negative amounts', () => {
    it('handles negative money', () => {
      const result = exchange(money('-1000.00', 'USD'), { from: 'USD', rate: '0.85', to: 'EUR' });

      expect(result).toEqual({ amount: -85000n, currency: 'EUR' });
    });
  });

  describe('error handling', () => {
    it('throws CurrencyMismatchError on currency mismatch', () => {
      const rate: ExchangeRate = { from: 'EUR', rate: '0.85', to: 'GBP' };

      expect(() => exchange(money('100.00', 'USD'), rate)).toThrow(CurrencyMismatchError);
      expect(() => exchange(money('100.00', 'USD'), rate)).toThrow('Currency mismatch');
    });

    it('throws InvalidCurrencyError when rate.to is not a valid ISO 4217 code', () => {
      expect(() => exchange(money('100.00', 'USD'), { from: 'USD', rate: '1.0', to: 'FAKE' })).toThrow(
        InvalidCurrencyError,
      );
      expect(() => exchange(money('100.00', 'USD'), { from: 'USD', rate: '1.0', to: 'FAKE' })).toThrow(
        'Invalid ISO 4217 currency code',
      );
    });

    it('throws CoinsError for invalid rate string', () => {
      expect(() => exchange(money('100.00', 'USD'), { from: 'USD', rate: 'not-a-number', to: 'EUR' })).toThrow(
        CoinsError,
      );
    });

    it('throws CoinsError for empty string rate', () => {
      expect(() => exchange(money('100.00', 'USD'), { from: 'USD', rate: '', to: 'EUR' })).toThrow(CoinsError);
      expect(() => exchange(money('100.00', 'USD'), { from: 'USD', rate: '', to: 'EUR' })).toThrow(
        'non-empty decimal string',
      );
    });

    it('throws CoinsError for negative exchange rate', () => {
      expect(() => exchange(money('100.00', 'USD'), { from: 'USD', rate: '-0.85', to: 'EUR' })).toThrow(CoinsError);
      expect(() => exchange(money('100.00', 'USD'), { from: 'USD', rate: '-0.85', to: 'EUR' })).toThrow(
        'Exchange rate must be non-negative',
      );
    });
  });

  describe('negative near-zero rounding (1 minor unit exchanged at 0.5 rate)', () => {
    // -1 cent × 0.5 rate = -0.5 EUR cents — quotient is 0n but true result is negative
    const oneNegUsd: ExchangeRate = { from: 'USD', rate: '0.5', to: 'EUR' };

    it("'half-away-from-zero' rounds -0.5 to -1", () => {
      expect(exchange(money(-1n, 'USD'), oneNegUsd)).toEqual({ amount: -1n, currency: 'EUR' });
    });

    it("'floor' rounds -0.5 toward −∞ to -1", () => {
      expect(exchange(money(-1n, 'USD'), oneNegUsd, 'floor')).toEqual({ amount: -1n, currency: 'EUR' });
    });

    it("'ceiling' rounds -0.5 toward +∞ to 0", () => {
      expect(exchange(money(-1n, 'USD'), oneNegUsd, 'ceiling')).toEqual({ amount: 0n, currency: 'EUR' });
    });

    it("'up' rounds -0.5 away from zero to -1", () => {
      expect(exchange(money(-1n, 'USD'), oneNegUsd, 'up')).toEqual({ amount: -1n, currency: 'EUR' });
    });

    it("'down' truncates -0.5 toward zero to 0", () => {
      expect(exchange(money(-1n, 'USD'), oneNegUsd, 'down')).toEqual({ amount: 0n, currency: 'EUR' });
    });
  });
});
