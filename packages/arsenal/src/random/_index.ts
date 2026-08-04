import type { RandomSource } from './source';

export function randomIndex(exclusiveMax: number, source?: RandomSource): number {
  const value = source?.next() ?? crypto.getRandomValues(new Uint32Array(1))[0]! / 0x100000000;

  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('random source must return a finite number in [0, 1)');
  }

  return Math.floor(value * exclusiveMax);
}
