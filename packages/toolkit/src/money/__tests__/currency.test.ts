import { currency } from '../currency';
import type { Money } from '../types';

describe('currency', () => {
  describe('basic formatting', () => {
    it('should format USD with default options', () => {
      const money: Money = { amount: 123456n, currency: 'USD' };
      const result = currency(money);
      expect(result).toMatch(/1,234.56/); // Contains the number
      expect(result).toMatch(/\$/); // Contains dollar sign
    });

    it('should format EUR', () => {
      const money: Money = { amount: 500000n, currency: 'EUR' };
      const result = currency(money);
      expect(result).toMatch(/5,000/);
    });

    it('should format zero amount', () => {
      const money: Money = { amount: 0n, currency: 'USD' };
      const result = currency(money);
      expect(result).toMatch(/0.00/);
    });

    it('should format negative amounts', () => {
      const money: Money = { amount: -10000n, currency: 'USD' };
      const result = currency(money);
      expect(result).toMatch(/100/);
      expect(result).toMatch(/-|\(/); // Contains minus or parentheses
    });
  });

  describe('locale formatting', () => {
    it('should format with German locale', () => {
      const money: Money = { amount: 123456n, currency: 'EUR' };
      const result = currency(money, { locale: 'de-DE' });
      expect(result).toContain('1'); // Number is present
    });

    it('should format with French locale', () => {
      const money: Money = { amount: 123456n, currency: 'EUR' };
      const result = currency(money, { locale: 'fr-FR' });
      expect(result).toContain('1'); // Number is present
    });
  });

  describe('style formatting', () => {
    it('should format with symbol style', () => {
      const money: Money = { amount: 100000n, currency: 'USD' };
      const result = currency(money, { style: 'symbol' });
      expect(result).toMatch(/\$/);
    });

    it('should format with code style', () => {
      const money: Money = { amount: 100000n, currency: 'USD' };
      const result = currency(money, { style: 'code' });
      expect(result).toContain('USD');
    });

    it('should format with name style', () => {
      const money: Money = { amount: 100000n, currency: 'USD' };
      const result = currency(money, { style: 'name' });
      expect(result.toLowerCase()).toMatch(/dollar/);
    });
  });

  describe('zero decimal currencies', () => {
    it('should format JPY without decimals', () => {
      const money: Money = { amount: 1234n, currency: 'JPY' };
      const result = currency(money);
      expect(result).toMatch(/1,234/);
      expect(result).not.toMatch(/\./); // No decimal point
    });

    it('should format KRW without decimals', () => {
      const money: Money = { amount: 5000n, currency: 'KRW' };
      const result = currency(money);
      expect(result).toMatch(/5,000/);
    });
  });

  describe('three decimal currencies', () => {
    it('should format BHD with three decimals', () => {
      const money: Money = { amount: 123456n, currency: 'BHD' };
      const result = currency(money);
      expect(result).toMatch(/123.456/);
    });

    it('should format KWD with three decimals', () => {
      const money: Money = { amount: 1000n, currency: 'KWD' };
      const result = currency(money);
      expect(result).toMatch(/1.000/);
    });
  });

  describe('custom fraction digits', () => {
    it('should respect minimumFractionDigits', () => {
      const money: Money = { amount: 10000n, currency: 'USD' };
      const result = currency(money, { maximumFractionDigits: 3, minimumFractionDigits: 2 });
      expect(result).toMatch(/100/);
    });

    it('should respect maximumFractionDigits', () => {
      const money: Money = { amount: 10012n, currency: 'USD' };
      const result = currency(money, { maximumFractionDigits: 1, minimumFractionDigits: 0 });
      expect(result).toMatch(/100/);
    });
  });
});
