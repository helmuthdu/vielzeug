import type { RandomSource } from './source';

import { randomIndex } from './_index';

/**
 * Generates a random integer between two values, inclusive.
 *
 * @example
 * ```ts
 * random(1, 10); // a random integer between 1 and 10
 * ```
 *
 * @param min - The minimum value.
 * @param max - The maximum value.
 * @returns A random integer between min and max.
 */
export function random(min: number, max: number, source?: RandomSource): number {
  if (min > max) throw new RangeError('random: minimum value must not be greater than maximum value');

  return randomIndex(max - min + 1, source) + min;
}
