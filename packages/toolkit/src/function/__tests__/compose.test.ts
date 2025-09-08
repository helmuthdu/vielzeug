import { compose } from '../compose';

describe('compose', () => {
  it('should compose functions from right to left', () => {
    const add = (x: number) => x + 2;
    const multiply = (x: number) => x * 3;
    const subtract = (x: number) => x - 4;

    const composedFn = compose(subtract, multiply, add);
    expect(composedFn(5)).toBe(17); // ((5 + 2) * 3) - 4 = 17
  });

  it('should work with a single function', () => {
    const add = (x: number) => x + 2;

    const composedFn = compose(add);
    expect(composedFn(5)).toBe(7); // 5 + 2 = 7
  });

  it('should throw an error if no functions are provided', () => {
    expect(() => compose()).toThrow('compose requires at least one function');
  });

  it('should handle functions with different types of arguments', () => {
    const toUpperCase = (str: string) => str.toUpperCase();
    const appendExclamation = (str: string) => `${str}!`;

    const composedFn = compose(appendExclamation, toUpperCase);
    expect(composedFn('hello')).toBe('HELLO!');
  });

  it('should handle functions that return undefined', () => {
    const returnUndefined = () => undefined;
    const add = (x: number) => x + 2;

    const composedFn = compose(returnUndefined, add);
    expect(composedFn(1)).toBeUndefined();
  });

  it('should handle asynchronous functions', async () => {
    const asyncAdd = async (x: number) => x + 1;
    const asyncMultiply = async (x: number) => x * 2;

    const composedFn = compose(asyncMultiply, asyncAdd);
    const result = await composedFn(3);
    expect(result).toBe(8); // (3 + 1) * 2 = 8
  });

  it('should pass the initial value through the pipeline', () => {
    const identity = <T>(x: T) => x;

    const composedFn = compose(identity);
    expect(composedFn(42)).toBe(42);
  });
});
