import { boil } from '../boil';

describe('boil', () => {
  it('returns undefined for an empty array', () => {
    expect(boil([], (a, _b) => a)).toBeUndefined();
  });

  it('returns the only element for a single-element array', () => {
    expect(boil([42], (a, b) => a + b)).toBe(42);
    expect(boil(['x'], (a, b) => a + b)).toBe('x');
  });

  it('reduces an array of numbers using sum', () => {
    expect(boil([1, 2, 3], (a, b) => a + b)).toBe(6);
  });

  it('reduces an array of numbers using max', () => {
    expect(boil([1, 5, 3, 2], (a, b) => (a > b ? a : b))).toBe(5);
  });

  it('reduces an array of numbers using min', () => {
    expect(boil([4, 2, 8, 1], (a, b) => (a < b ? a : b))).toBe(1);
  });

  it('reduces an array of strings by concatenation', () => {
    expect(boil(['a', 'b', 'c'], (a, b) => a + b)).toBe('abc');
  });

  it('reduces an array of objects', () => {
    const arr = [{ v: 1 }, { v: 2 }, { v: 3 }];
    const result = boil(arr, (a, b) => ({ v: a.v + b.v }));
    expect(result).toEqual({ v: 6 });
  });

  it('throws TypeError if the first argument is not an array', () => {
    // @ts-expect-error
    expect(() => boil(null, (a, _b) => a)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => boil(undefined, (a, _b) => a)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => boil(123, (a, _b) => a)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => boil({}, (a, _b) => a)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => boil('string', (a, _b) => a)).toThrow(TypeError);
  });
});
