/**
 * Returns a new randomly-shuffled copy of the array using Fisher-Yates
 * with `crypto.getRandomValues`. Does not mutate the input.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4];
 * shuffle(arr); // e.g. [3, 1, 4, 2]
 * ```
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000) * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
