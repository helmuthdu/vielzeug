/**
 * Shuffles an array randomly.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4];
 * shuffle(arr); // a shuffled version of the array
 * ```
 *
 * @param array - The array to shuffle.
 *
 * @returns A new shuffled array.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff) * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
