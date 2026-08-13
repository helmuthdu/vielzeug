import { randomIndex } from './_index';
import type { RandomSource } from './source';

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
export function shuffle<T>(array: T[], source?: RandomSource): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1, source);

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
