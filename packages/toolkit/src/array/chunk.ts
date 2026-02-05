import { assert } from '../function/assert';
import { isArray } from '../typed/isArray';
import { isString } from '../typed/isString';

type ChunkOptions = {
  overlap?: boolean;
  pad?: string;
};

type ChunkResult<T> = (T extends string ? string : T[])[];

/**
 * Splits an array or string into chunks of a specified size.
 *
 * @example
 * ```ts
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 * chunk("hello", 2) // ["he", "ll", "o"]
 * chunk("hello", 2, { overlap: true }) // [" h", "he", "el", "ll", "lo", "o "]
 * ```
 *
 * @param input - The input array or string to be chunked.
 * @param size - The size of each chunk.
 * @param [options] - Additional options for chunking.
 * @param [options.overlap] -
 * @param [options.pad] -
 *
 * @returns An array of chunks.
 *
 * @throws {RangeError} If the chunk size is invalid.
 * @throws {TypeError} If the input type is invalid.
 */
export function chunk<T>(input: T[] | string, size = 2, options: ChunkOptions = {}): ChunkResult<T> {
  assert(isArray(input as T[]) || isString(input), 'Argument must be an array or string.', {
    args: { input },
    type: TypeError,
  });

  assert(size >= 1, 'Chunk size must be at least 1.', {
    args: { size },
    type: RangeError,
  });

  const { overlap = false, pad = ' ' } = options;

  if (isString(input) && overlap) {
    const padded = pad + input + pad;
    const numChunks = padded.length - size + 1;
    return Array.from({ length: numChunks }, (_, i) => padded.slice(i, i + size)) as ChunkResult<T>;
  }

  return Array.from({ length: Math.ceil(input.length / size) }, (_, i) =>
    input.slice(i * size, i * size + size),
  ) as ChunkResult<T>;
}
