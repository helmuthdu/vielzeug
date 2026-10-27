/** Color helpers for the heatmap ramp: parse, interpolate, and pick readable text. */

export interface Rgb {
  b: number;
  g: number;
  r: number;
}

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGB_FUNC = /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,\s][\d.]+\s*)?\)$/i;

/**
 * Parses `#rgb`, `#rrggbb`, or `rgb()/rgba()` in comma or space syntax (alpha
 * ignored); anything else (CSS vars, named colors) is null. Space syntax matters
 * because `toCssColor` emits it, so ramp fills always round-trip through here.
 */
export function parseColor(color: string): Rgb | null {
  const hexLong = HEX_LONG.exec(color);

  if (hexLong) {
    return {
      b: Number.parseInt(hexLong[3]!, 16),
      g: Number.parseInt(hexLong[2]!, 16),
      r: Number.parseInt(hexLong[1]!, 16),
    };
  }

  const hexShort = HEX_SHORT.exec(color);

  if (hexShort) {
    return {
      b: Number.parseInt(hexShort[3]!, 16) * 17,
      g: Number.parseInt(hexShort[2]!, 16) * 17,
      r: Number.parseInt(hexShort[1]!, 16) * 17,
    };
  }

  const rgb = RGB_FUNC.exec(color);

  if (rgb) {
    return { b: Number(rgb[3]!), g: Number(rgb[2]!), r: Number(rgb[1]!) };
  }

  return null;
}

export function toCssColor({ b, g, r }: Rgb): string {
  return `rgb(${r} ${g} ${b})`;
}

/** Linear sRGB blend; `t` is clamped to [0, 1]. */
export function mixColors(from: Rgb, to: Rgb, t: number): Rgb {
  const k = Math.min(1, Math.max(0, t));

  return {
    b: Math.round(from.b + (to.b - from.b) * k),
    g: Math.round(from.g + (to.g - from.g) * k),
    r: Math.round(from.r + (to.r - from.r) * k),
  };
}

/**
 * A ramp over `range` colors: parseable colors interpolate continuously;
 * a range with unparseable entries (CSS vars, named colors) degrades to
 * nearest-step selection, which keeps the ramp honest without measurement.
 */
export function createRamp(range: readonly string[]): (t: number) => string {
  const parsed = range.map(parseColor);

  return (t: number): string => {
    const k = Math.min(1, Math.max(0, t));

    if (range.length >= 2 && parsed.every((color): color is Rgb => color !== null)) {
      const position = k * (range.length - 1);
      const index = Math.min(range.length - 2, Math.floor(position));

      return toCssColor(mixColors(parsed[index]!, parsed[index + 1]!, position - index));
    }

    return range[Math.min(range.length - 1, Math.round(k * (range.length - 1)))]!;
  };
}

/** WCAG relative luminance (0..1); null for unparseable colors. */
export function relativeLuminance(color: string): number | null {
  const rgb = parseColor(color);

  if (!rgb) return null;

  const channel = (value: number): number => {
    const c = value / 255;

    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
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
