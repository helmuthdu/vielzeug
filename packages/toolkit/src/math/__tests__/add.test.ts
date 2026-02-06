import { add } from '../add';

describe('add', () => {
  describe('number addition', () => {
    it('should add two positive numbers', () => {
      expect(add(10, 20)).toBe(30);
      expect(add(5, 3)).toBe(8);
    });

    it('should add negative numbers', () => {
      expect(add(-10, -20)).toBe(-30);
      expect(add(-5, 10)).toBe(5);
      expect(add(10, -5)).toBe(5);
    });

    it('should handle zero', () => {
      expect(add(0, 0)).toBe(0);
      expect(add(5, 0)).toBe(5);
      expect(add(0, 5)).toBe(5);
    });

    it('should handle decimal numbers', () => {
      expect(add(0.1, 0.2)).toBeCloseTo(0.3);
      expect(add(1.5, 2.5)).toBe(4);
    });
  });

  describe('bigint addition', () => {
    it('should add two positive bigints', () => {
      expect(add(10n, 20n)).toBe(30n);
      expect(add(100n, 200n)).toBe(300n);
    });

    it('should add negative bigints', () => {
      expect(add(-10n, -20n)).toBe(-30n);
      expect(add(-5n, 10n)).toBe(5n);
    });

    it('should handle zero bigint', () => {
      expect(add(0n, 0n)).toBe(0n);
      expect(add(5n, 0n)).toBe(5n);
    });
  });

  describe('error handling', () => {
    it('should throw error for mixed types', () => {
      // biome-ignore lint/suspicious/noExplicitAny: -
      expect(() => add(10 as any, 20n as any)).toThrow(TypeError);
      // biome-ignore lint/suspicious/noExplicitAny: -
      expect(() => add(10n as any, 20 as any)).toThrow(TypeError);
    });
  });
});
