import { range } from '../range';

describe('range', () => {
  it('should create a range with positive step', () => {
    expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
  });

  it('should create a range with negative step', () => {
    expect(range(10, 0, -2)).toEqual([10, 8, 6, 4, 2]);
  });

  it('should return an empty array if start equals stop', () => {
    expect(range(5, 5, 1)).toEqual([]);
  });

  it('should return an empty array if step is positive and start is greater than stop', () => {
    expect(range(10, 0, 2)).toEqual([]);
  });

  it('should return an empty array if step is negative and start is less than stop', () => {
    expect(range(0, 10, -2)).toEqual([]);
  });

  it('should throw an error if step is 0', () => {
    expect(() => range(0, 10, 0)).toThrow('Step cannot be 0');
  });

  it('should handle fractional steps', () => {
    expect(range(0, 1, 0.2)).toEqual([0, 0.2, 0.4, 0.6000000000000001, 0.8]);
  });

  it('should handle large ranges', () => {
    expect(range(0, 100, 25)).toEqual([0, 25, 50, 75]);
  });
  it('should throw an error if range is too large', () => {
    // 10,000,001 items
    expect(() => range(0, 10_000_001, 1)).toThrow('Range exceeds maximum allowed size of 10,000,000');
  });
});
