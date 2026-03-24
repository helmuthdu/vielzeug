import { fold } from '../fold';

describe('fold', () => {
  it('returns undefined for an empty array', () => {
    expect(fold([], (a, _b) => a)).toBeUndefined();
  });

  it('returns the only element for a single-element array', () => {
    expect(fold([42], (a, b) => a + b)).toBe(42);
    expect(fold(['x'], (a, b) => a + b)).toBe('x');
  });

  it('reduces an array of numbers using sum', () => {
    expect(fold([1, 2, 3], (a, b) => a + b)).toBe(6);
  });

  it('reduces an array of numbers using max', () => {
    expect(fold([1, 5, 3, 2], (a, b) => (a > b ? a : b))).toBe(5);
  });

  it('reduces an array of numbers using min', () => {
    expect(fold([4, 2, 8, 1], (a, b) => (a < b ? a : b))).toBe(1);
  });

  it('reduces an array of strings by concatenation', () => {
    expect(fold(['a', 'b', 'c'], (a, b) => a + b)).toBe('abc');
  });

  it('reduces an array of objects', () => {
    const arr = [{ v: 1 }, { v: 2 }, { v: 3 }];
    const result = fold(arr, (a, b) => ({ v: a.v + b.v }));

    expect(result).toEqual({ v: 6 });
  });

  it('throws TypeError if the first argument is not an array', () => {
    expect(() => fold(null as any, (a, _b) => a)).toThrow(TypeError);
    expect(() => fold(undefined as any, (a, _b) => a)).toThrow(TypeError);
    expect(() => fold(123 as any, (a, _b) => a)).toThrow(TypeError);
    expect(() => fold({} as any, (a, _b) => a)).toThrow(TypeError);
    expect(() => fold('string' as any, (a, _b) => a)).toThrow(TypeError);
  });
});
