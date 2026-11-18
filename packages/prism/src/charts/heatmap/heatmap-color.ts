/** Color helpers for the heatmap ramp: parse, interpolate, and pick readable text. */

import {
  mix,
  parseColor as parseCssColor,
  type Rgba,
  toRgbString,
  relativeLuminance as wcagLuminance,
} from '@vielzeug/palette';

/**
 * Parses a CSS color via `@vielzeug/palette` (`#rgb`/`#rrggbb`, `rgb()` comma
 * and space syntax, `hsl()`, `oklab()`/`oklch()`, and CSS named colors);
 * anything unparseable (CSS vars) is null. Space syntax matters because
 * `toRgbString` emits it, so ramp fills always round-trip through here.
 */
export function parseColor(color: string): Rgba | null {
  try {
    return parseCssColor(color);
  } catch {
    return null;
  }
}

/**
 * A ramp over `range` colors: parseable colors interpolate continuously;
 * a range with unparseable entries (CSS vars) degrades to nearest-step
 * selection, which keeps the ramp honest without measurement.
 */
export function createRamp(range: readonly string[]): (t: number) => string {
  const parsed = range.map(parseColor);

  return (t: number): string => {
    const k = Math.min(1, Math.max(0, t));

    if (range.length >= 2 && parsed.every((color) => color !== null)) {
      const position = k * (range.length - 1);
      const index = Math.min(range.length - 2, Math.floor(position));

      return toRgbString(mix(parsed[index]!, parsed[index + 1]!, position - index));
    }

    return range[Math.min(range.length - 1, Math.round(k * (range.length - 1)))]!;
  };
}

/** WCAG relative luminance (0..1); null for unparseable colors. */
export function relativeLuminance(color: string): number | null {
  const rgb = parseColor(color);

  if (!rgb) return null;

  return wcagLuminance(rgb);
}

/**
 * The in-cell text color for a fill: black or white by the fill's luminance,
 * falling back to the theme's text color when the fill cannot be measured.
 * The 0.179 threshold is the exact WCAG crossover for pure black and white,
 * which is the only text pair with no luminance band where both fail 4.5:1 —
 * so in-cell values always clear AA on any ramp.
 */
export function valueColorFor(fill: string, fallback: string): string {
  const luminance = relativeLuminance(fill);

  if (luminance === null) return fallback;

  return luminance > 0.179 ? '#000' : '#fff';
}
