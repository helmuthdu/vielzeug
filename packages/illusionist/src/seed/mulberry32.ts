import type { RandomSource } from '@vielzeug/arsenal/random';

/**
 * Mulberry32 — a fast, deterministic 32-bit PRNG.
 *
 * Not cryptographically secure. Use `createSeed()` without a seed for
 * `crypto.getRandomValues`-backed randomness in security-sensitive contexts.
 *
 * @param seed - A 32-bit integer seed.
 * @returns A {@link RandomSource} producing floats in `[0, 1)`.
 */
export function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0;

  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;

      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
