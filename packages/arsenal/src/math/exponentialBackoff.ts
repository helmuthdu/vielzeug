/**
 * Computes the exponential backoff cap for a given zero-based attempt number.
 * Returns `min(1000 × 2ⁿ, maxMs)` — the cap before optional jitter is applied.
 *
 * Multiply the result by `Math.random()` for full-jitter backoff.
 *
 * @example
 * ```ts
 * // Deterministic (sourcerer-style):
 * const delay = exponentialBackoff(attempt);          // 1s, 2s, 4s, … capped at 30s
 *
 * // Full-jitter (courier-style):
 * const delay = Math.random() * exponentialBackoff(attempt);
 * ```
 *
 * @param attempt - Zero-based attempt index (0 = first retry wait).
 * @param maxMs   - Maximum cap in milliseconds. Defaults to 30 000.
 */
export function exponentialBackoff(attempt: number, maxMs = 30_000): number {
  return Math.min(1000 * Math.pow(2, attempt), maxMs);
}
