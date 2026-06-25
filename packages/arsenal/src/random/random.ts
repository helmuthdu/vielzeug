import { ArsenalError } from '../errors';

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
export function random(min: number, max: number): number {
  if (min > max) throw new ArsenalError('random: minimum value must be less than maximum value');

  // Divide by 0x100000000 (not 0xffffffff) to produce [0, 1) instead of [0, 1]
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;

  return Math.floor(randomValue * (max - min + 1)) + min;
}
