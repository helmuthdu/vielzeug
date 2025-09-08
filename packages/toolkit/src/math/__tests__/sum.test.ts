import { sum } from '../sum';

describe('sum', () => {
  it('should sum all numbers in an array', () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum([-1, -2, -3])).toBe(-6);
    expect(sum([0, 0, 0])).toBe(0);
  });

  it('should sum numbers mapped by a callback function', () => {
    const array = [{ value: 1 }, { value: 2 }, { value: 3 }];
    const callback = (item: { value: number }) => item.value;

    expect(sum(array, callback)).toBe(6);
  });

  it('should handle arrays with mixed types using a callback', () => {
    const array = [true, false, true];
    const callback = (item: boolean) => (item ? 1 : 0);

    expect(sum(array, callback)).toBe(2);
  });

  it('should return 0 for an empty array', () => {
    expect(sum([])).toBe(undefined);
  });

  it('should handle arrays with a mix of numbers and other types', () => {
    const array = [1, '2', true, null];
    const callback = (item: unknown) => (typeof item === 'number' ? item : 0);

    expect(sum(array, callback)).toBe(1);
  });

  it('should work without a callback for arrays of numbers', () => {
    expect(sum([10, 20, 30])).toBe(60);
  });

  it('should handle arrays with undefined or null values', () => {
    const array = [1, null, undefined, 2];
    const callback = (item: unknown) => (item ? (item as number) : 0);

    expect(sum(array, callback)).toBe(3);
  });
});
