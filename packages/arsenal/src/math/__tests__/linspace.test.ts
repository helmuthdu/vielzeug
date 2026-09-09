import { linspace } from '../linspace';

describe('linspace', () => {
  it('should create a range with default steps (5)', () => {
    expect(linspace(0, 10)).toEqual([0, 2.5, 5, 7.5, 10]);
  });

  it('should create a range with specified steps', () => {
    expect(linspace(0, 10, 3)).toEqual([0, 5, 10]);
  });

  it('should handle a range with a single step', () => {
    expect(linspace(0, 10, 1)).toEqual([0]);
  });

  it('should handle a range with two steps', () => {
    expect(linspace(0, 10, 2)).toEqual([0, 10]);
  });

  it('should handle negative ranges', () => {
    expect(linspace(-10, -5, 3)).toEqual([-10, -7.5, -5]);
  });

  it('should handle reversed ranges', () => {
    expect(linspace(10, 0, 5)).toEqual([10, 7.5, 5, 2.5, 0]);
  });

  it('rejects invalid step counts', () => {
    expect(() => linspace(0, 10, 0)).toThrow(RangeError);
    expect(() => linspace(0, 10, -1)).toThrow(RangeError);
    expect(() => linspace(0, 10, 1.5)).toThrow(RangeError);
  });

  it('should handle min and max being the same', () => {
    expect(linspace(5, 5, 3)).toEqual([5, 5, 5]);
  });
});
