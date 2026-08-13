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
 * @throws {TypeError} If the input is not an array or string.
 * @throws {RangeError} If the chunk size is not a positive integer.
 */
export function chunk(input: string, size?: number): string[];
export function chunk<T>(input: T[], size?: number): T[][];
export function chunk<T>(input: T[] | string, size = 2): string[] | T[][] {
  if (!Array.isArray(input) && typeof input !== 'string')
    throw new TypeError('chunk: argument must be an array or string');

  if (!Number.isInteger(size) || size < 1) throw new RangeError('chunk: size must be a positive integer');

  return Array.from({ length: Math.ceil(input.length / size) }, (_, i) => input.slice(i * size, i * size + size)) as
    | string[]
    | T[][];
}
