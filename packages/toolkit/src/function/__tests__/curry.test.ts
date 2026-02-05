import { curry } from '../curry';

describe('curry', () => {
  it('should curry a function', () => {
    const add: (a: number, b: number, c: number) => number = (a, b, c) => a + b + c;
    const curriedAdd = curry(add);

    expect(curriedAdd(1)(2)(3)).toBe(6);
    expect(curriedAdd(1, 2)(3)).toBe(6);
    expect(curriedAdd(1)(2, 3)).toBe(6);
    expect(curriedAdd(1, 2, 3)).toBe(6);
  });

  it('should support custom arity', () => {
    const addWithDefault = (a: number, b: number, c = 0) => a + b + c;
    // Force the function to be treated as requiring 3 arguments
    const curriedAdd = curry(addWithDefault as (a: number, b: number, c: number) => number, 3);

    const step1 = curriedAdd(1);
    const step2 = step1(2);
    expect(typeof step2).toBe('function');

    const result = step2(3);
    expect(result).toBe(6);
  });
});
