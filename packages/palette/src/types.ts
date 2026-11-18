/**
 * A color in extended-range sRGB. `r`, `g`, `b` are 0–255 for displayable
 * colors but may fall outside that range when a color was produced from an
 * out-of-gamut OKLCH/HSL value or parsed from out-of-range channels; nothing
 * in the conversion pipeline clips them. `a` is always clamped to 0–1. Use
 * `isDisplayable` to test the gamut and the formatters (which clamp) to
 * produce display-safe output.
 */
export type Rgba = Readonly<{
  r: number;
  g: number;
  b: number;
  a: number;
}>;

/** A color in HSL. `h` is degrees 0–360, `s` and `l` are percentages 0–100, `a` is 0–1. */
export type Hsla = Readonly<{
  h: number;
  s: number;
  l: number;
  a: number;
}>;

/** A color in OKLCH. `l` is lightness 0–1, `c` is chroma, `h` is hue in degrees, `a` is alpha 0–1. */
export type Oklch = Readonly<{
  l: number;
  c: number;
  h: number;
  a: number;
}>;

/** Options for the string formatters. When `alpha` is true the alpha channel is always written; otherwise it is written only when the color is translucent. */
export type FormatOptions = Readonly<{
  alpha?: boolean;
}>;

/** Options for `readableOn`. */
export type ReadableOnOptions = Readonly<{
  /** WCAG conformance level. Defaults to `'AA'`. */
  level?: 'AA' | 'AAA';
  /** Use the large-text thresholds (3 / 4.5 instead of 4.5 / 7). Defaults to false. */
  large?: boolean;
}>;

/** Options for `ramp`. */
export type RampOptions = Readonly<{
  /** Number of swatches in the ramp. Must be an integer of at least 2. */
  steps: number;
  /** OKLab lightness of the first (darkest) swatch, 0–1. Defaults to 0.15. */
  minLightness?: number;
  /** OKLab lightness of the last (lightest) swatch, 0–1. Defaults to 0.95. */
  maxLightness?: number;
}>;
