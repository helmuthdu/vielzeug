import { parsePositiveNumber } from '../utils';

describe('field helpers', () => {
  describe('parsePositiveNumber', () => {
    it('returns null for nullish and invalid values', () => {
      expect(parsePositiveNumber(undefined)).toBeNull();
      expect(parsePositiveNumber(null)).toBeNull();
      expect(parsePositiveNumber('')).toBeNull();
      expect(parsePositiveNumber('abc')).toBeNull();
      expect(parsePositiveNumber(0)).toBeNull();
      expect(parsePositiveNumber(-3)).toBeNull();
    });

    it('returns numbers for positive numeric inputs', () => {
      expect(parsePositiveNumber(1)).toBe(1);
      expect(parsePositiveNumber('12')).toBe(12);
      expect(parsePositiveNumber(2.5)).toBe(2.5);
    });
  });
});
