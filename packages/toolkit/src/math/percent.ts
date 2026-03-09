/**
 * Calculates what percentage `value` is of `total`.
 *
 * @example
 * ```ts
 * percent(25, 100);  // 25
 * percent(1, 3);     // 33.333...
 * percent(50, 200);  // 25
 * percent(0, 100);   // 0
 * percent(5, 0);     // 0
 * ```
 *
 * @param value - The partial value.
 * @param total - The total value.
 *
 * @returns The percentage (0–100 scale). Returns 0 when `total` is 0.
 */
export function percent(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}
