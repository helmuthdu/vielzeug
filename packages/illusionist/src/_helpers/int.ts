import type { RandomSource } from '@vielzeug/arsenal/random';
import { random } from '@vielzeug/arsenal/random';

/** Generates a random integer in `[min, max]` (inclusive). */
export function int(min: number, max: number, source?: RandomSource): number {
  return random(min, max, source);
}
