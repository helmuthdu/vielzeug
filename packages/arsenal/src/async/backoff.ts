/**
 * Computes an exponential backoff delay cap for a given zero-based attempt number.
 * Returns `min(1000 × 2ⁿ, maxMs)` — the cap before optional jitter is applied.
 *
 * Multiply the result by `Math.random()` for full-jitter backoff.
 *
 * @example
 * ```ts
 * // Deterministic (sourcerer-style):
 * const delay = backoff(attempt); // 1s, 2s, 4s, … capped at 30s
 *
 * // Full-jitter (courier-style):
 * const delay = Math.random() * backoff(attempt);
 * ```
 *
 * @param attempt - Zero-based attempt index (0 = first retry wait).
 * @param maxMs   - Maximum cap in milliseconds. Defaults to 30 000.
 */
export function backoff(attempt: number, maxMs = 30_000): number {
  const n = Math.max(0, Number.isNaN(attempt) ? 0 : Math.floor(attempt));

  return Math.min(1000 * (n <= 30 ? 1 << n : Math.pow(2, n)), maxMs);
}
