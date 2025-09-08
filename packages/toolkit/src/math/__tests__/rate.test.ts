import { rate } from '../rate';

describe('rate', () => {
  it('should create a range with default steps (5)', () => {
    expect(rate(0, 10)).toEqual([0, 2.5, 5, 7.5, 10]);
  });

  it('should create a range with specified steps', () => {
    expect(rate(0, 10, 3)).toEqual([0, 5, 10]);
  });

  it('should handle a range with a single step', () => {
    expect(rate(0, 10, 1)).toEqual([0]);
  });

  it('should handle a range with two steps', () => {
    expect(rate(0, 10, 2)).toEqual([0, 10]);
  });

  it('should handle negative ranges', () => {
    expect(rate(-10, -5, 3)).toEqual([-10, -7.5, -5]);
  });

  it('should handle reversed ranges', () => {
    expect(rate(10, 0, 5)).toEqual([10, 7.5, 5, 2.5, 0]);
  });

  it('should return an empty array if steps is less than 1', () => {
    expect(rate(0, 10, 0)).toEqual([]);
    expect(rate(0, 10, -1)).toEqual([]);
  });

  it('should handle min and max being the same', () => {
    expect(rate(5, 5, 3)).toEqual([5, 5, 5]);
  });
});
