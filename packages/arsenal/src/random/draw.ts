import { random } from './random';

/**
 * “Draw” a random item from an array.
 *
 * @example
 * ```ts
 * draw([1, 2, 3]) // 3
 * ```
 *
 * @param array - The array to draw from.
 *
 * @returns A random item from the array or `undefined` if the array is empty.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
export const draw = <T>(array: T[]): T | undefined => {
  if (array.length === 0) return undefined;

  return array[random(0, array.length - 1)];
};
