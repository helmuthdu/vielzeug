import { subtract } from '../subtract';

describe('subtract', () => {
  describe('number subtraction', () => {
    it('should subtract two positive numbers', () => {
      expect(subtract(20, 10)).toBe(10);
      expect(subtract(100, 30)).toBe(70);
    });

    it('should handle negative results', () => {
      expect(subtract(10, 20)).toBe(-10);
      expect(subtract(5, 15)).toBe(-10);
    });

    it('should subtract negative numbers', () => {
      expect(subtract(-10, -5)).toBe(-5);
      expect(subtract(10, -5)).toBe(15);
      expect(subtract(-10, 5)).toBe(-15);
    });

    it('should handle zero', () => {
      expect(subtract(0, 0)).toBe(0);
      expect(subtract(5, 0)).toBe(5);
      expect(subtract(0, 5)).toBe(-5);
    });

    it('should handle decimal numbers', () => {
      expect(subtract(0.3, 0.1)).toBeCloseTo(0.2);
      expect(subtract(5.5, 2.5)).toBe(3);
    });
  });

  describe('bigint subtraction', () => {
    it('should subtract two positive bigints', () => {
      expect(subtract(20n, 10n)).toBe(10n);
      expect(subtract(100n, 30n)).toBe(70n);
    });

    it('should handle negative results', () => {
      expect(subtract(10n, 20n)).toBe(-10n);
    });

    it('should subtract negative bigints', () => {
      expect(subtract(-10n, -5n)).toBe(-5n);
      expect(subtract(10n, -5n)).toBe(15n);
    });

    it('should handle zero bigint', () => {
      expect(subtract(0n, 0n)).toBe(0n);
      expect(subtract(5n, 0n)).toBe(5n);
    });
  });

  describe('error handling', () => {
    it('should throw error for mixed types', () => {
      // biome-ignore lint/suspicious/noExplicitAny: -
      expect(() => subtract(10 as any, 20n as any)).toThrow(TypeError);
      // biome-ignore lint/suspicious/noExplicitAny: -
      expect(() => subtract(10n as any, 20 as any)).toThrow(TypeError);
    });
  });
});
