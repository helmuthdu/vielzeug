/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { reduce } from '../reduce';

describe('reduce', () => {
  it('should reduce an array with a synchronous callback', () => {
    const arr = [1, 2, 3, 4];
    const result = reduce(arr, (acc, curr) => acc + curr, 0);
    expect(result).toBe(10); // 1 + 2 + 3 + 4 = 10
  });

  it('should reduce an array with an asynchronous callback', async () => {
    const arr = [1, 2, 3, 4];
    const result = await reduce(arr, async (acc, curr) => acc + curr, 0);
    expect(result).toBe(10); // 1 + 2 + 3 + 4 = 10
  });

  it('should handle an empty array with a synchronous callback', () => {
    const arr: number[] = [];
    const result = reduce(arr, (acc, curr) => acc + curr, 0);
    expect(result).toBe(0); // Initial value is returned
  });

  it('should handle an empty array with an asynchronous callback', async () => {
    const arr: number[] = [];
    const result = await reduce(arr, async (acc, curr) => acc + curr, 0);
    expect(result).toBe(0); // Initial value is returned
  });

  it('should work with non-numeric values', () => {
    const arr = ['a', 'b', 'c'];
    const result = reduce(arr, (acc, curr) => acc + curr, '');
    expect(result).toBe('abc'); // Concatenates strings
  });

  it('should handle asynchronous callbacks with non-numeric values', async () => {
    const arr = ['a', 'b', 'c'];
    const result = await reduce(arr, async (acc, curr) => acc + curr, '');
    expect(result).toBe('abc'); // Concatenates strings
  });

  it('should throw an error if the first argument is not an array', () => {
    expect(() => reduce(null as any, (acc, curr: any) => acc + curr, 0)).toThrow(TypeError);
  });

  it('should handle complex objects with synchronous callbacks', () => {
    const arr = [{ value: 1 }, { value: 2 }, { value: 3 }];
    const result = reduce(arr, (acc, curr) => acc + curr.value, 0);
    expect(result).toBe(6); // 1 + 2 + 3 = 6
  });

  it('should handle complex objects with asynchronous callbacks', async () => {
    const arr = [{ value: 1 }, { value: 2 }, { value: 3 }];
    const result = await reduce(arr, async (acc, curr) => acc + curr.value, 0);
    expect(result).toBe(6); // 1 + 2 + 3 = 6
  });

  it('should handle an initial value of undefined', () => {
    const arr = [1, 2, 3];
    const result = reduce(arr, (acc, curr) => (acc ?? 0) + curr, undefined as any);
    expect(result).toBe(6); // 0 + 1 + 2 + 3 = 6
  });

  it('should handle asynchronous callbacks with an initial value of undefined', async () => {
    const arr = [1, 2, 3];
    const result = await reduce(arr, async (acc, curr) => (acc ?? 0) + curr, undefined as any);
    expect(result).toBe(6); // 0 + 1 + 2 + 3 = 6
  });
});
