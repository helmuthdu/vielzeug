// Public root surface of @vielzeug/palette. Every public export goes through this file.
import {
  hslToSrgb as hslToSrgbImpl,
  oklabToOklch,
  oklabToSrgb,
  oklchToOklab,
  srgbToHsl as srgbToHslImpl,
  srgbToOklab,
} from './_convert.js';
import { contrastRatio, mix, ramp, readableOn, relativeLuminance } from './_core.js';
import { toHex, toHslString, toOklchString, toRgbString } from './_format.js';
import { parseColor } from './_parse.js';
import type { Hsla, Oklch, Rgba } from './types.js';

export { PaletteConfigError, PaletteError, PaletteParseError } from './errors.js';
export type { FormatOptions, Hsla, Oklab, Oklch, RampOptions, ReadableOnOptions, Rgba } from './types.js';
export {
  contrastRatio,
  mix,
  parseColor,
  ramp,
  readableOn,
  relativeLuminance,
  toHex,
  toHslString,
  toOklchString,
  toRgbString,
};

/** Converts sRGB (0–255, clamped) to HSL. */
export function srgbToHsl(color: Rgba): Hsla {
  return srgbToHslImpl(color);
}

/** Converts HSL to sRGB (0–255, clamped to the displayable range). */
export function hslToSrgb(color: Hsla): Rgba {
  return hslToSrgbImpl(color);
}

/** Converts sRGB (0–255, clamped) to OKLCH. */
export function srgbToOklch(color: Rgba): Oklch {
  return oklabToOklch(srgbToOklab(color));
}

/** Converts OKLCH to sRGB (0–255, clamped to the displayable range). */
export function oklchToSrgb(color: Oklch): Rgba {
  return oklabToSrgb(oklchToOklab(color));
}
