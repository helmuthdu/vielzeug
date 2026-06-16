import { pipe } from '../pipe';

describe('pipe', () => {
  it('preserves parameter and return types', () => {
    const parse = (value: string) => Number.parseInt(value, 10);
    const double = (value: number) => value * 2;
    const format = (value: number) => `${value}px`;

    const piped = pipe(parse, double, format);

    expectTypeOf(piped).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(piped).returns.toEqualTypeOf<string>();
  });

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

  it('pipe() with no args returns an identity function', () => {
    const id = pipe();

    expect(id(42)).toBe(42);
    expect(id('hello')).toBe('hello');
  });

  it('should pass the initial value through the pipeline', () => {
    const identity = <T>(x: T) => x;

    const pipedFn = pipe(identity);

    expect(pipedFn(42)).toBe(42);
  });
});
