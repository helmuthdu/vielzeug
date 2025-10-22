/**
 * Rounds a number to a specified number of decimal places.
 *
 * The `precision` argument is limited to be within the range of -323 to +292 to avoid NaN results.
 *
 * @example
 * ```ts
 * round(123.456) // 123
 * round(123.456, -1) // 120
 * round(123.456, 1, Math.ceil) // 123.5
 * round(123.456, 1, Math.floor) // 123.4
 * ```
 *
 * @param value - The number to round.
 * @param precision - The number of decimal places to round to.
 * @param [parser] - (optional) function to convert the number to a value.
 *
 * @returns The rounded number.
 */
export function round(value: number, precision = 0, parser: (value: number) => number = Math.round): number {
  if (precision === 0) return parser(value);

  const factor = 10 ** Math.max(-323, Math.min(precision, 292));
  return parser(value * factor) / factor;
}
