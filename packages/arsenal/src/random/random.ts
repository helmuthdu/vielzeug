import { secureRandomIndex } from '../_common/_secureRandomIndex';
import { ArsenalValidationError } from '../errors';

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
  if (min > max) throw new ArsenalValidationError('random: minimum value must not be greater than maximum value');

  return secureRandomIndex(max - min + 1) + min;
}
