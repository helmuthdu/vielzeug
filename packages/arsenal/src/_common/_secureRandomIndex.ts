/**
 * Returns a cryptographically random integer in `[0, exclusiveMax)` via `crypto.getRandomValues`.
 * Shared by `random()`, `shuffle()`, and `drawMany()` — the single source of truth for converting
 * a random `Uint32` into a bounded index.
 *
 * Module-private: underscore-prefixed file is excluded from barrel exports.
 * @internal
 */
export function secureRandomIndex(exclusiveMax: number): number {
  // Divide by 0x100000000 (not 0xffffffff) to produce [0, 1) instead of [0, 1]
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0]! / 0x100000000;

  return Math.floor(randomValue * exclusiveMax);
}
