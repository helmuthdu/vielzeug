import { multiply } from '../multiply';

describe('multiply', () => {
  describe('number multiplication', () => {
    it('should multiply two positive numbers', () => {
      expect(multiply(10, 5)).toBe(50);
      expect(multiply(7, 8)).toBe(56);
    });

    it('should handle negative numbers', () => {
      expect(multiply(-10, 5)).toBe(-50);
      expect(multiply(10, -5)).toBe(-50);
      expect(multiply(-10, -5)).toBe(50);
    });

    it('should handle zero', () => {
      expect(multiply(0, 0)).toBe(0);
      expect(multiply(5, 0)).toBe(0);
      expect(multiply(0, 5)).toBe(0);
    });

    it('should handle decimal numbers', () => {
      expect(multiply(0.1, 3)).toBeCloseTo(0.3);
      expect(multiply(2.5, 4)).toBe(10);
    });

    it('should handle multiplication by 1', () => {
      expect(multiply(42, 1)).toBe(42);
      expect(multiply(1, 42)).toBe(42);
    });
  });

  describe('bigint multiplication', () => {
    it('should multiply two positive bigints', () => {
      expect(multiply(10n, 5n)).toBe(50n);
      expect(multiply(100n, 200n)).toBe(20000n);
    });

    it('should handle negative bigints', () => {
      expect(multiply(-10n, 5n)).toBe(-50n);
      expect(multiply(10n, -5n)).toBe(-50n);
      expect(multiply(-10n, -5n)).toBe(50n);
    });

    it('should handle zero bigint', () => {
      expect(multiply(0n, 0n)).toBe(0n);
      expect(multiply(5n, 0n)).toBe(0n);
    });
  });

  describe('error handling', () => {
    it('should throw error for mixed types', () => {
      // biome-ignore lint/suspicious/noExplicitAny: -
      expect(() => multiply(10 as any, 20n as any)).toThrow(TypeError);
      // biome-ignore lint/suspicious/noExplicitAny: -
      expect(() => multiply(10n as any, 20 as any)).toThrow(TypeError);
    });
  });
});
