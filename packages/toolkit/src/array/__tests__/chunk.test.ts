import { chunk } from '../chunk';

describe('chunk', () => {
  describe('Array chunking', () => {
    it('should chunk an array into equal parts', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should throw an error if chunk size is less than 1 for arrays', () => {
      expect(() => chunk([1, 2, 3], 0)).toThrow(RangeError);
    });

    it('should handle an empty array', () => {
      expect(chunk([], 2)).toEqual([]);
    });
  });

  describe('String chunking without overlap', () => {
    it('should chunk a string into equal parts', () => {
      expect(chunk('hello', 2)).toEqual(['he', 'll', 'o']);
    });

    it('should handle an empty string', () => {
      expect(chunk('', 2)).toEqual([]);
    });
  });

  describe('String chunking with overlap', () => {
    it('should chunk a string with overlap', () => {
      expect(chunk('hello', 2, { overlap: true })).toEqual([' h', 'he', 'el', 'll', 'lo', 'o ']);
    });

    it('should pad the string when overlap is enabled', () => {
      expect(chunk('hello', 3, { overlap: true, pad: '*' })).toEqual(['*he', 'hel', 'ell', 'llo', 'lo*']);
    });
  });

  describe('Invalid inputs', () => {
    it('should throw a TypeError for non-array and non-string inputs', () => {
      // biome-ignore lint/suspicious/noExplicitAny: -
      expect(() => chunk(123 as any, 2)).toThrow(TypeError);
    });
  });
});
