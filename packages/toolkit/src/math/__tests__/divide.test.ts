import { divide } from '../divide';

describe('divide', () => {
  describe('number division', () => {
    it('should divide two positive numbers', () => {
      expect(divide(20, 5)).toBe(4);
      expect(divide(100, 10)).toBe(10);
    });

    it('should handle negative numbers', () => {
      expect(divide(-20, 5)).toBe(-4);
      expect(divide(20, -5)).toBe(-4);
      expect(divide(-20, -5)).toBe(4);
    });

    it('should handle decimal results', () => {
      expect(divide(10, 3)).toBeCloseTo(3.333, 3);
      expect(divide(1, 2)).toBe(0.5);
    });

    it('should handle division by 1', () => {
      expect(divide(42, 1)).toBe(42);
    });

    it('should throw error for division by zero', () => {
      expect(() => divide(10, 0)).toThrow('Division by zero');
      expect(() => divide(0, 0)).toThrow('Division by zero');
    });
  });

  describe('bigint division', () => {
    it('should divide two positive bigints', () => {
      expect(divide(20n, 5n)).toBe(4n);
      expect(divide(100n, 10n)).toBe(10n);
    });

    it('should handle negative bigints', () => {
      expect(divide(-20n, 5n)).toBe(-4n);
      expect(divide(20n, -5n)).toBe(-4n);
      expect(divide(-20n, -5n)).toBe(4n);
    });

    it('should truncate remainder (integer division)', () => {
      expect(divide(10n, 3n)).toBe(3n);
      expect(divide(7n, 2n)).toBe(3n);
    });

    it('should throw error for division by zero', () => {
      expect(() => divide(10n, 0n)).toThrow('Division by zero');
    });
  });

  describe('error handling', () => {
    it('should throw error for mixed types', () => {
      // biome-ignore lint/suspicious/noExplicitAny: -
      expect(() => divide(10 as any, 20n as any)).toThrow(TypeError);
      // biome-ignore lint/suspicious/noExplicitAny: -
      expect(() => divide(10n as any, 20 as any)).toThrow(TypeError);
    });
  });
});
