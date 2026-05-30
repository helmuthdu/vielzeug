import { clamp } from './clamp';

/**
 * Normalizes a value from [min, max] into [0, 1].
 */
export function normalize(value: number, min: number, max: number): number {
  if (min === max) return 0;

  return clamp((value - min) / (max - min), 0, 1);
}
