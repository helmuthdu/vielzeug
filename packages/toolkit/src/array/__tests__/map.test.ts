import { fp } from '../../function/fp';
import { map } from '../map';

describe('map', () => {
  it('should apply the callback to each element in the array', () => {
    const array = [1, 2, 3];
    const callback = (value: number) => value * 2;

    expect(map(array, callback)).toEqual([2, 4, 6]);
  });

  it('should pass the correct arguments to the callback', () => {
    const array = [10, 20, 30];
    const mockCallback = vi.fn((value: number) => value);

    map(array, mockCallback);

    expect(mockCallback).toHaveBeenCalledTimes(array.length);
    array.forEach((value, index) => {
      expect(mockCallback).toHaveBeenCalledWith(value, index, array);
    });
  });

  it('should return a promise if lazy is true', async () => {
    const array = [1, 2, 3];
    const callback = async (value: number) => value * 2;
    const result = map(array, callback);

    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toEqual([2, 4, 6]);
  });

  it('should throw a TypeError if the first argument is not an array', () => {
    const notArray = 'not an array';
    const callback = (value: number) => value * 2;

    // biome-ignore lint/suspicious/noExplicitAny: -
    expect(() => map(notArray as unknown as any, callback as any)).toThrow(TypeError);
  });

  it('should handle an empty array', () => {
    const array: number[] = [];
    const callback = (value: number) => value * 2;
    const result = map(array, callback);

    expect(result).toEqual([]);
  });

  it('should work with a callback that returns different types', () => {
    const array = [1, 2, 3];
    const callback = (value: number) => `Value: ${value}`;
    const result = map(array, callback);

    expect(result).toEqual(['Value: 1', 'Value: 2', 'Value: 3']);
  });

  it('should handle null or undefined values in the array', () => {
    const array = [1, null, undefined, 2];
    const callback = (value: number | null | undefined) => (value ? value * 2 : 0);

    expect(map(array, callback)).toEqual([2, 0, 0, 4]);
  });
});

describe('fp.map', () => {
  it('should return a function that maps an array using the callback', () => {
    const callback = (value: number) => value * 2;
    const mapWithCallback = fp<number>(map, callback);

    expect(mapWithCallback([1, 2, 3])).toEqual([2, 4, 6]);
  });

  it('should support lazy evaluation with map', async () => {
    const callback = async (value: number) => value * 2;
    const mapWithCallback = fp<number>(map, callback);

    const result = mapWithCallback([1, 2, 3]);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toEqual([2, 4, 6]);
  });
});
