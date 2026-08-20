import { hash } from '@vielzeug/arsenal/object';
import type { RandomSource } from '@vielzeug/arsenal/random';

import { IllusionistSeedError } from '../errors';
import { mulberry32 } from './mulberry32';

/**
 * Creates a {@link RandomSource} from a seed.
 *
 * - **Number seed** — used directly as the mulberry32 state.
 * - **String seed** — hashed via `arsenal`'s `hash()` to produce a 32-bit integer.
 * - **No seed** — falls back to `crypto.getRandomValues` for cryptographic randomness.
 *
 * @example
 * ```ts
 * const a = createSeed(12345);     // deterministic
 * const b = createSeed('hello');   // deterministic (hashed)
 * const c = createSeed();          // cryptographic (non-deterministic)
 * ```
 */
export function createSeed(seed?: number | string): RandomSource {
  if (seed == null) return cryptoSource();

  if (typeof seed === 'number') {
    if (!Number.isFinite(seed)) throw new IllusionistSeedError(`createSeed: numeric seed must be finite, got ${seed}`);

    return mulberry32(Math.trunc(seed));
  }

  const hashed = hash(seed);

  // FNV-1a-ish fold from the hash string into a 32-bit integer.
  let state = 0;

  for (let i = 0; i < hashed.length; i++) {
    state = (Math.imul(state, 31) + hashed.charCodeAt(i)) >>> 0;
  }

  return mulberry32(state);
}

function cryptoSource(): RandomSource {
  return {
    next(): number {
      return crypto.getRandomValues(new Uint32Array(1))[0]! / 0x100000000;
    },
  };
}
