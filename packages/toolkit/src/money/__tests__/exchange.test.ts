import { type ExchangeRate, exchange } from '../exchange';
import type { Money } from '../types';

describe('exchange', () => {
  describe('basic conversion', () => {
    it('should convert USD to EUR', () => {
      const usd: Money = { amount: 100000n, currency: 'USD' };
      const rate: ExchangeRate = { from: 'USD', rate: 0.85, to: 'EUR' };

      const result = exchange(usd, rate);

      expect(result.currency).toBe('EUR');
      expect(result.amount).toBe(85000n);
    });

    it('should convert EUR to USD', () => {
      const eur: Money = { amount: 85000n, currency: 'EUR' };
      const rate: ExchangeRate = { from: 'EUR', rate: 1.18, to: 'USD' };

      const result = exchange(eur, rate);

      expect(result.currency).toBe('USD');
      expect(Number(result.amount)).toBeCloseTo(100300, -2);
    });

    it('should handle zero amount', () => {
      const money: Money = { amount: 0n, currency: 'USD' };
      const rate: ExchangeRate = { from: 'USD', rate: 0.85, to: 'EUR' };

      const result = exchange(money, rate);

      expect(result.amount).toBe(0n);
      expect(result.currency).toBe('EUR');
    });
  });

  describe('different exchange rates', () => {
    it('should handle rate of 1 (no change)', () => {
      const money: Money = { amount: 100000n, currency: 'USD' };
      const rate: ExchangeRate = { from: 'USD', rate: 1.0, to: 'USD' };

      const result = exchange(money, rate);

      expect(result.amount).toBe(100000n);
    });

    it('should handle high exchange rates', () => {
      const money: Money = { amount: 10000n, currency: 'USD' };
      const rate: ExchangeRate = { from: 'USD', rate: 110.0, to: 'JPY' };

      const result = exchange(money, rate);

      expect(result.currency).toBe('JPY');
      expect(result.amount).toBeGreaterThan(1000000n);
    });

    it('should handle low exchange rates', () => {
      const money: Money = { amount: 1000000n, currency: 'JPY' };
      const rate: ExchangeRate = { from: 'JPY', rate: 0.0091, to: 'USD' };

      const result = exchange(money, rate);

      expect(result.currency).toBe('USD');
      expect(result.amount).toBeLessThan(100000n);
    });
  });

  describe('precision handling', () => {
    it('should maintain precision with decimal rates', () => {
      const money: Money = { amount: 100000n, currency: 'USD' };
      const rate: ExchangeRate = { from: 'USD', rate: 0.73, to: 'GBP' };

      const result = exchange(money, rate);

      expect(result.currency).toBe('GBP');
      expect(result.amount).toBe(73000n);
    });

    it('should handle complex decimal rates', () => {
      const money: Money = { amount: 100000n, currency: 'USD' };
      const rate: ExchangeRate = { from: 'USD', rate: 0.847532, to: 'EUR' };

      const result = exchange(money, rate);

      expect(result.currency).toBe('EUR');
      // Should be close to 84753
      expect(Number(result.amount)).toBeGreaterThan(84000);
      expect(Number(result.amount)).toBeLessThan(85000);
    });
  });

  describe('error handling', () => {
    it('should throw error for currency mismatch', () => {
      const money: Money = { amount: 100000n, currency: 'USD' };
      const rate: ExchangeRate = { from: 'EUR', rate: 0.85, to: 'GBP' };

      expect(() => exchange(money, rate)).toThrow('Currency mismatch');
      expect(() => exchange(money, rate)).toThrow('expected EUR, got USD');
    });
  });

  describe('negative amounts', () => {
    it('should handle negative amounts', () => {
      const money: Money = { amount: -100000n, currency: 'USD' };
      const rate: ExchangeRate = { from: 'USD', rate: 0.85, to: 'EUR' };

      const result = exchange(money, rate);

      expect(result.amount).toBe(-85000n);
      expect(result.currency).toBe('EUR');
    });
  });
});
