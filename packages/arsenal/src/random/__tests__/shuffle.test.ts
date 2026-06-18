import { shuffle } from '../../array/shuffle';

describe('shuffle', () => {
  it('should return a new array with the same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);

    expect(result.sort()).toEqual(arr.sort());
    expect(result).not.toBe(arr);
  });

  it('should not mutate the original array', () => {
    const arr = [1, 2, 3];
    const copy = [...arr];

    shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it('should return an empty array when input is empty', () => {
    const arr: number[] = [];
    const result = shuffle(arr);

    expect(result).toEqual([]);
    expect(result).not.toBe(arr);
  });

  it('should return the same array for single-element input', () => {
    const arr = [42];
    const result = shuffle(arr);

    expect(result).toEqual([42]);
    expect(result).not.toBe(arr);
  });

  it('should eventually produce a different order', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let different = false;

    for (let i = 0; i < 20; i++) {
      if (shuffle(arr).join() !== arr.join()) {
        different = true;
        break;
      }
    }
    expect(different).toBe(true);
  });

  it('should work with arrays of objects', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const result = shuffle(arr);

    expect(result).toHaveLength(3);
    expect(result.map((o) => o.a).sort()).toEqual([1, 2, 3]);
  });

  it('never produces undefined elements — regression B1 (RNG divisor off-by-one)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];

    for (let i = 0; i < 200; i++) {
      const result = shuffle(arr);

      expect(result).toHaveLength(arr.length);
      expect(result.every((v) => v !== undefined)).toBe(true);
    }
  });

  it('should throw TypeError if input is not an array', () => {
    expect(() => shuffle(null as any)).toThrow(TypeError);
    expect(() => shuffle(undefined as any)).toThrow(TypeError);
    expect(() => shuffle({} as any)).toThrow(TypeError);
  });
});
