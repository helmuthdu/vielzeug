import type { RandomSource } from '@vielzeug/arsenal/random';

/** Returns a float in `[0, 1)` from the source, falling back to `crypto.getRandomValues` when unset. */
export function nextFloat(source?: RandomSource): number {
  return source?.next() ?? crypto.getRandomValues(new Uint32Array(1))[0]! / 0x100000000;
}
