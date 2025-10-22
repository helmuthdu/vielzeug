import { pick } from '../pick';

describe('pick', () => {
  it('should pick the first element matching the predicate and apply the callback', () => {
    const arr = [1, 2, 3, 4];
    const result = pick(
      arr,
      (x) => x * x,
      (x) => x > 2,
    );
    expect(result).toBe(9);
  });

  it('should use the default predicate (not nil) if none is provided', () => {
    const arr = [null, undefined, 5, 0];
    const result = pick(arr, (x) => x, undefined);
    expect(result).toBe(5);
  });

  it('should return undefined if no element matches the predicate', () => {
    const arr = [1, 2, 3];
    const result = pick(
      arr,
      (x) => x,
      (x) => x > 10,
    );
    expect(result).toBeUndefined();
  });

  it('should work with objects', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const result = pick(
      arr,
      (obj) => obj.a,
      (obj) => obj.a === 2,
    );
    expect(result).toBe(2);
  });

  it('should pass index and array to the predicate and callback', () => {
    const arr = [10, 20, 30];
    let called = false;
    pick(
      arr,
      (value, index, array) => {
        called = true;
        expect(array).toBe(arr);
        expect(typeof index).toBe('number');
        return value;
      },
      (value, index, array) => {
        expect(array).toBe(arr);
        expect(typeof index).toBe('number');
        return value === 20;
      },
    );
    expect(called).toBe(true);
  });

  it('should return undefined for an empty array', () => {
    const arr: number[] = [];
    const result = pick(
      arr,
      (x) => x,
      (x) => x > 0,
    );
    expect(result).toBeUndefined();
  });

  it('should throw TypeError if input is not an array', () => {
    // @ts-expect-error
    expect(() => pick(null, (x) => x)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => pick(undefined, (x) => x)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => pick({}, (x) => x)).toThrow(TypeError);
  });

  it('should support async callback', async () => {
    const arr = [1, 2, 3, 4];
    const asyncCallback = async (x: number) => x * 2;
    const result = await pick(arr, asyncCallback, (x) => x > 2);
    expect(result).toBe(6);
  });

  it('should support async callback with no matching predicate', async () => {
    const arr = [1, 2, 3];
    const asyncCallback = async (x: number) => x * 2;
    const result = await pick(arr, asyncCallback, (x) => x > 10);
    expect(result).toBeUndefined();
  });
});
