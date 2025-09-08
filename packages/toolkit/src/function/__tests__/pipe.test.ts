import { pipe } from '../pipe';

describe('pipe', () => {
  it('should correctly pipe multiple functions', () => {
    const add = (x: number) => x + 2;
    const multiply = (x: number) => x * 3;
    const subtract = (x: number) => x - 4;

    const pipedFn = pipe(subtract, multiply, add);
    expect(pipedFn(5)).toBe(5); // ((5 - 4) * 3) + 2 = 5
  });

  it('should work with a single function', () => {
    const square = (x: number) => x * x;

    const pipedFn = pipe(square);
    expect(pipedFn(4)).toBe(16);
  });

  it('should handle non-numeric values', () => {
    const toUpperCase = (str: string) => str.toUpperCase();
    const appendExclamation = (str: string) => `${str}!`;

    const pipedFn = pipe(toUpperCase, appendExclamation);
    expect(pipedFn('hello')).toBe('HELLO!');
  });

  it('should throw an error if no functions are provided', () => {
    expect(() => pipe()).toThrow('pipe requires at least one function');
  });

  it('should pass the initial value through the pipeline', () => {
    const identity = <T>(x: T) => x;

    const pipedFn = pipe(identity);
    expect(pipedFn(42)).toBe(42);
  });

  it('should handle asynchronous functions', async () => {
    const asyncAdd = async (x: number) => x + 1;
    const asyncMultiply = async (x: number) => x * 2;

    const pipedFn = pipe(asyncAdd, asyncMultiply);
    const result = await pipedFn(3);
    expect(result).toBe(8); // (3 + 1) * 2 = 8
  });
});
