import { secureRandomIndex } from '../_common/_secureRandomIndex';
import { random } from './random';

/**
 * Picks a single random item from an array.
 * Returns `undefined` if the array is empty.
 *
 * @example
 * ```ts
 * draw([1, 2, 3]); // e.g. 2
 * draw([]);         // undefined
 * ```
 */
export function draw<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;

  return array[random(0, array.length - 1)];
}

/**
 * Picks up to `n` unique random items from an array using a cryptographically
 * random shuffle (Fisher-Yates via `crypto.getRandomValues`).
 * Returns a new array; does not mutate the input.
 *
 * @example
 * ```ts
 * drawMany([1, 2, 3, 4, 5], 3); // e.g. [4, 1, 3]
 * drawMany([1, 2], 10);          // [1, 2] (clamped to array length)
 * ```
 */
export function drawMany<T>(array: T[], n: number): T[] {
  const count = Math.max(0, Math.min(array.length, Math.floor(n)));

  if (count === 0) return [];

  if (count === array.length) return [...array];

  const copy = [...array];

  for (let index = copy.length - 1; index > 0; index--) {
    const randomIndex = secureRandomIndex(index + 1);
    const temp = copy[index];

    copy[index] = copy[randomIndex]!;
    copy[randomIndex] = temp!;
  }

  return copy.slice(0, count);
}
