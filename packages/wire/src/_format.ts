/** Formats a number for SVG path output: rounded to micro-precision, no `-0`, no exponent noise. */
export function fmt(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}
