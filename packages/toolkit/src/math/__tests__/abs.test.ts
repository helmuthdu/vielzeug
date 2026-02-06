import { describe, expect, it } from 'vitest';
import { abs } from '../abs';

describe('abs', () => {
  describe('number absolute value', () => {
    it('should return absolute value of negative numbers', () => {
      expect(abs(-5)).toBe(5);
      expect(abs(-10)).toBe(10);
      expect(abs(-3.14)).toBe(3.14);
    });

    it('should return positive numbers unchanged', () => {
      expect(abs(5)).toBe(5);
      expect(abs(10)).toBe(10);
      expect(abs(3.14)).toBe(3.14);
    });

    it('should return zero for zero', () => {
      expect(abs(0)).toBe(0);
      expect(abs(-0)).toBe(0);
    });
  });

  describe('bigint absolute value', () => {
    it('should return absolute value of negative bigints', () => {
      expect(abs(-5n)).toBe(5n);
      expect(abs(-100n)).toBe(100n);
      expect(abs(-999999n)).toBe(999999n);
    });

    it('should return positive bigints unchanged', () => {
      expect(abs(5n)).toBe(5n);
      expect(abs(100n)).toBe(100n);
      expect(abs(999999n)).toBe(999999n);
    });

    it('should return zero for zero bigint', () => {
      expect(abs(0n)).toBe(0n);
    });
  });

  describe('edge cases', () => {
    it('should handle very large negative numbers', () => {
      expect(abs(-Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle very large negative bigints', () => {
      expect(abs(-999999999999999999n)).toBe(999999999999999999n);
    });
  });
});
