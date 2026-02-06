import { distribute } from '../distribute';

describe('distribute', () => {
  describe('number distribution', () => {
    it('should distribute evenly when possible', () => {
      const result = distribute(100, 4);
      expect(result).toEqual([25, 25, 25, 25]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('should handle remainder distribution', () => {
      const result = distribute(100, 3);
      expect(result).toEqual([34, 33, 33]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('should distribute to single part', () => {
      const result = distribute(100, 1);
      expect(result).toEqual([100]);
    });

    it('should handle small amounts', () => {
      const result = distribute(5, 3);
      expect(result).toEqual([2, 2, 1]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(5);
    });

    it('should distribute remainder to first items', () => {
      const result = distribute(10, 3);
      expect(result).toEqual([4, 3, 3]);
    });
  });

  describe('bigint distribution', () => {
    it('should distribute evenly with bigint', () => {
      const result = distribute(10000n, 4);
      expect(result).toEqual([2500n, 2500n, 2500n, 2500n]);
      expect(result.reduce((a, b) => a + b, 0n)).toBe(10000n);
    });

    it('should handle remainder with bigint', () => {
      const result = distribute(10000n, 3);
      expect(result).toEqual([3334n, 3333n, 3333n]);
      expect(result.reduce((a, b) => a + b, 0n)).toBe(10000n);
    });

    it('should distribute to single part', () => {
      const result = distribute(10000n, 1);
      expect(result).toEqual([10000n]);
    });
  });

  describe('error handling', () => {
    it('should throw error for parts less than 1', () => {
      expect(() => distribute(100, 0)).toThrow('Parts must be at least 1');
      expect(() => distribute(100, -1)).toThrow('Parts must be at least 1');
    });
  });
});
