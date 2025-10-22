import { compact } from '../compact';

describe('compact', () => {
  it('should remove falsy values from the array', () => {
    const array = [0, 1, false, 2, '', 3, null, undefined, Number.NaN];
    expect(compact(array)).toEqual([1, 2, 3]);
  });

  it('should return an empty array if all values are falsy', () => {
    const array = [0, false, '', null, undefined, Number.NaN];
    expect(compact(array)).toEqual([]);
  });

  it('should return the same array if no values are falsy', () => {
    const array = [1, 2, 3, 'hello', true];
    expect(compact(array)).toEqual(array);
  });

  it('should return an empty array if the input array is empty', () => {
    const array: unknown[] = [];
    expect(compact(array)).toEqual([]);
  });

  it('should throw a TypeError if the input is not an array', () => {
    const notArray = 'not an array';
    // biome-ignore lint/suspicious/noExplicitAny: -
    expect(() => compact(notArray as unknown as any)).toThrow(TypeError);
  });
});
