import type { RandomSource } from '@vielzeug/arsenal/random';

/**
 * Generates a random float in `[min, max)`.
 * Pass `min` = `max` for a constant; the result is still `min` (not `max`).
 */
export function float(min: number, max: number, source?: RandomSource): number {
  if (min > max) return min;

  const span = max - min;
  const raw = source?.next() ?? crypto.getRandomValues(new Uint32Array(1))[0]! / 0x100000000;

  return min + raw * span;
}

/** Generates a random float with a fixed number of decimal places. */
export function floatFixed(min: number, max: number, decimals = 2, source?: RandomSource): number {
  const factor = 10 ** decimals;
  const scaled = float(min * factor, max * factor, source);

  return Math.round(scaled) / factor;
}
