import { allocate } from '../allocate';

describe('allocate', () => {
  describe('number allocation', () => {
    it('should allocate proportionally', () => {
      const result = allocate(100, [1, 2, 3]);
      expect(result).toEqual([16, 33, 51]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('should handle equal distribution', () => {
      const result = allocate(100, [1, 1, 1]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('should handle single ratio', () => {
      const result = allocate(100, [1]);
      expect(result).toEqual([100]);
    });

    it('should handle zero remainders', () => {
      const result = allocate(90, [1, 2, 3]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(90);
    });

    it('should handle large differences in ratios', () => {
      const result = allocate(1000, [1, 99]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
    });
  });

  describe('bigint allocation', () => {
    it('should allocate proportionally with bigint', () => {
      const result = allocate(10000n, [1, 2, 3]);
      expect(result.reduce((a, b) => a + b, 0n)).toBe(10000n);
    });

    it('should handle equal distribution', () => {
      const result = allocate(10000n, [1, 1, 1]);
      expect(result.reduce((a, b) => a + b, 0n)).toBe(10000n);
    });

    it('should handle single ratio', () => {
      const result = allocate(10000n, [1]);
      expect(result).toEqual([10000n]);
    });
  });

  describe('error handling', () => {
    it('should throw error for empty ratios', () => {
      expect(() => allocate(100, [])).toThrow('Ratios array cannot be empty');
    });

    it('should throw error for negative ratios', () => {
      expect(() => allocate(100, [1, -2, 3])).toThrow('Ratios must be non-negative');
    });

    it('should throw error for all-zero ratios', () => {
      expect(() => allocate(100, [0, 0, 0])).toThrow('Total ratio cannot be zero');
    });
  });
});
