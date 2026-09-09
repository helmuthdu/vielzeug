import { random } from '@vielzeug/arsenal';

import type { RandomSource } from '../types';

/** Generates a random integer in `[min, max]` (inclusive). */
export function int(min: number, max: number, source?: RandomSource): number {
  return random(min, max, source);
}
