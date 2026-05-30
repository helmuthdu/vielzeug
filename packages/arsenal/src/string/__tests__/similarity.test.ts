import { similarity } from '../similarity';

describe('similarity', () => {
  it('should return 1 for identical strings', () => {
    expect(similarity('abc', 'abc')).toBe(1);
  });

  it('should return 0 for completely different strings', () => {
    expect(similarity('a', 'b')).toBe(0);
  });

  it('should return 0.5 for strings with one differing character', () => {
    expect(similarity('ab', 'ac')).toBe(0.5);
  });

  it('should handle cases where one string is a substring of the other', () => {
    expect(similarity('doe', 'John Doe')).toBeCloseTo(0.375, 5);
  });

  it('should return a fractional similarity for partially matching strings', () => {
    expect(similarity('abc', 'axc')).toBeCloseTo(0.6666666666666667, 5);
  });

  it('should calculate similarity for longer strings with multiple differences', () => {
    expect(similarity('kitten', 'sitting')).toBeCloseTo(0.5714285714285714, 5);
  });

  it('should return 0 if one of the strings is empty', () => {
    expect(similarity('', 'abc')).toBe(0);
    expect(similarity('abc', '')).toBe(0);
  });

  it('should return 1 for two empty strings', () => {
    expect(similarity('', '')).toBe(1);
  });

  it('should handle strings with special characters', () => {
    expect(similarity('hello!', 'hello')).toBeCloseTo(0.8333333333333334, 5);
  });

  it('should handle strings with different cases', () => {
    expect(similarity('Hello', 'hello')).toBeCloseTo(1, 5);
  });
});
