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

  describe('numeric parts shorthand', () => {
    it('should distribute evenly among n parts', () => {
      const result = allocate(100, 3);

      expect(result).toEqual([33, 33, 34]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('should handle bigint with n parts', () => {
      const result = allocate(10000n, 4);

      expect(result.reduce((a, b) => a + b, 0n)).toBe(10000n);
      expect(result).toHaveLength(4);
    });

    it('should handle single part', () => {
      expect(allocate(100, 1)).toEqual([100]);
      expect(allocate(10000n, 1)).toEqual([10000n]);
    });

    it('should throw for non-integer parts', () => {
      expect(() => allocate(100, 1.5)).toThrow(RangeError);
    });

    it('should throw for zero parts', () => {
      expect(() => allocate(100, 0)).toThrow(RangeError);
    });

    it('should throw for negative parts', () => {
      expect(() => allocate(100, -2)).toThrow(RangeError);
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

  describe('edge cases', () => {
    it('zero-bucket ratios: [0, 0, 1] — first two buckets get 0', () => {
      const result = allocate(100, [0, 0, 1]);

      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(100);
      expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('zero amount distributes all zeros', () => {
      const result = allocate(0, [1, 2, 3]);

      expect(result).toEqual([0, 0, 0]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(0);
    });

    it('zero amount bigint distributes all zero bigints', () => {
      const result = allocate(0n, [1, 2, 3]);

      expect(result).toEqual([0n, 0n, 0n]);
    });

    it('bigint zero-bucket ratio: [0, 1] — first bucket gets 0n', () => {
      const result = allocate(100n, [0, 1]);

      expect(result[0]).toBe(0n);
      expect(result[1]).toBe(100n);
      expect(result.reduce((a, b) => a + b, 0n)).toBe(100n);
    });
  });
});
