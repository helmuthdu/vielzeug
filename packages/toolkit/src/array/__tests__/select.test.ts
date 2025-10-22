import { select } from '../select';

describe('select', () => {
  it('should select and map elements matching the predicate', () => {
    const arr = [1, 2, 3, 4];
    const result = select(
      arr,
      (x) => x * x,
      (x) => x > 2,
    );
    expect(result).toEqual([9, 16]);
  });

  it('should use the default predicate (not nil) if none is provided', () => {
    const arr = [null, undefined, 5, 0];
    const result = select(arr, (x) => x, undefined);
    expect(result).toEqual([5, 0]);
  });

  it('should return an empty array if no element matches the predicate', () => {
    const arr = [1, 2, 3];
    const result = select(
      arr,
      (x) => x,
      (x) => x > 10,
    );
    expect(result).toEqual([]);
  });

  it('should work with objects', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const result = select(
      arr,
      (obj) => obj.a,
      (obj) => obj.a >= 2,
    );
    expect(result).toEqual([2, 3]);
  });

  it('should pass index and array to the predicate and callback', () => {
    const arr = [10, 20, 30];
    let called = false;
    select(
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

  it('should return an empty array for an empty input array', () => {
    const arr: number[] = [];
    const result = select(
      arr,
      (x) => x,
      (x) => x > 0,
    );
    expect(result).toEqual([]);
  });

  it('should throw TypeError if input is not an array', () => {
    // @ts-expect-error
    expect(() => select(null, (x) => x)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => select(undefined, (x) => x)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => select({}, (x) => x)).toThrow(TypeError);
  });

  it('should support async callback', async () => {
    const arr = [1, 2, 3, 4];
    const asyncCallback = async (x: number) => x * 2;
    const result = await select(arr, asyncCallback, (x) => x > 2);
    expect(result).toEqual([6, 8]);
  });

  it('should support async callback with no matching predicate', async () => {
    const arr = [1, 2, 3];
    const asyncCallback = async (x: number) => x * 2;
    const result = await select(arr, asyncCallback, (x) => x > 10);
    expect(result).toEqual([]);
  });
});
