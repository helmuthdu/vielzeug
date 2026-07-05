import { ArsenalValidationError } from '../errors';
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
 * @throws {ArsenalValidationError} If the input is not an array or string, or if the chunk size is less than 1.
 */
export function chunk(input: string, size?: number): string[];
export function chunk<T>(input: T[], size?: number): T[][];
export function chunk<T>(input: T[] | string, size = 2): string[] | T[][] {
  if (!Array.isArray(input) && !isString(input))
    throw new ArsenalValidationError('chunk: argument must be an array or string');

  if (size < 1) throw new ArsenalValidationError('chunk: size must be at least 1');

  return Array.from({ length: Math.ceil(input.length / size) }, (_, i) => input.slice(i * size, i * size + size)) as
    string[] | T[][];
}
