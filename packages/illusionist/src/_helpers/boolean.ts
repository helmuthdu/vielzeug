import type { RandomSource } from '@vielzeug/arsenal/random';

import { nextFloat } from './next-float';

/** Generates a random boolean with an optional probability bias (0–1, default 0.5). */
export function boolean(source?: RandomSource, probability = 0.5): boolean {
  return nextFloat(source) < probability;
}
