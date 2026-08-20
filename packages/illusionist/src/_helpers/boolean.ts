import type { RandomSource } from '@vielzeug/arsenal/random';

/** Generates a random boolean with an optional probability bias (0–1, default 0.5). */
export function boolean(source?: RandomSource, probability = 0.5): boolean {
  const raw = source?.next() ?? crypto.getRandomValues(new Uint32Array(1))[0]! / 0x100000000;

  return raw < probability;
}
