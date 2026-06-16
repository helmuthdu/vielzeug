import { assert } from '../function/assert';
import { isString } from '../guards/isString';

/**
 * Splits an array or string into chunks of a specified size.
 *
 * @example
 * ```ts
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 * chunk('hello', 2) // ['he', 'll', 'o']
 * ```
 *
 * @param input - The input array or string to be chunked.
 * @param size - The size of each chunk (default 2).
 *
 * @returns An array of chunks.
 *
 * @throws {RangeError} If the chunk size is less than 1.
 * @throws {TypeError} If the input is not an array or string.
 */
export function chunk(input: string, size?: number): string[];
export function chunk<T>(input: T[], size?: number): T[][];
export function chunk<T>(input: T[] | string, size = 2): string[] | T[][] {
  assert(Array.isArray(input as T[]) || isString(input), 'Argument must be an array or string.', { type: TypeError });
  assert(size >= 1, 'Chunk size must be at least 1.', { type: RangeError });

  return Array.from({ length: Math.ceil(input.length / size) }, (_, i) => input.slice(i * size, i * size + size)) as
    | string[]
    | T[][];
}
