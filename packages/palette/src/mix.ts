import { clamp, isDisplayable, oklabToOklch, oklabToSrgb, oklchToOklab, srgbToOklab } from './convert.js';
import { PaletteConfigError } from './errors.js';
import type { RampOptions, Rgba } from './types.js';

/**
 * Interpolates two colors in OKLab with premultiplied alpha, matching CSS
 * `color-mix(in oklab, ...)`. `t` is 0 for `a`, 1 for `b`. A fully transparent
 * endpoint contributes no color, so mixing red with transparent black yields
 * red at half alpha rather than a darkened blend.
 */
export function mix(a: Rgba, b: Rgba, t: number): Rgba {
  if (!Number.isFinite(t) || t < 0 || t > 1) {
    throw new PaletteConfigError(`mix position t must be within [0, 1], got ${t}`);
  }
  const alphaA = clamp(a.a, 0, 1);
  const alphaB = clamp(b.a, 0, 1);
  const alpha = alphaA + (alphaB - alphaA) * t;
  const labA = srgbToOklab(a);
  const labB = srgbToOklab(b);
  // Premultiply every OKLab axis, including lightness, by alpha so
  // transparent endpoints do not pull the color toward black; divide back out
  // unless the result is invisible.
  const mixAxis = (ka: number, kb: number): number => {
    const value = ka * alphaA + (kb * alphaB - ka * alphaA) * t;
    return alpha === 0 ? value : value / alpha;
  };
  const lab = {
    a: mixAxis(labA.a, labB.a),
    alpha,
    b: mixAxis(labA.b, labB.b),
    l: mixAxis(labA.l, labB.l),
  };
  return oklabToSrgb(lab);
}

/**
 * Reduces an out-of-gamut OKLab color's chroma (binary search at fixed L and
 * hue) until it fits the sRGB gamut. Neutral colors are returned unchanged.
 */
function fitGamut(lab: { a: number; alpha: number; b: number; l: number }): typeof lab {
  if (isDisplayable(oklabToSrgb(lab))) return lab;
  const oklch = oklabToOklch(lab);
  if (oklch.c < 1e-6) return lab;
  let low = 0;
  let high = oklch.c;
  // ~20 halvings shrink the chroma interval below any visible step.
  for (let i = 0; i < 20; i += 1) {
    const mid = (low + high) / 2;
    const candidate = oklchToOklab({ a: lab.alpha, c: mid, h: oklch.h, l: lab.l });
    if (isDisplayable(oklabToSrgb(candidate))) low = mid;
    else high = mid;
  }
  return oklchToOklab({ a: lab.alpha, c: low, h: oklch.h, l: lab.l });
}

/**
 * Builds a deterministic ramp of `steps` swatches by interpolating OKLab
 * lightness between `minLightness` and `maxLightness` while keeping the base
 * color's hue. Chroma is reduced where needed so every swatch stays inside the
 * sRGB gamut, which keeps the hue stable across the ramp. Swatches run dark to
 * light.
 */
export function ramp(base: Rgba, options: RampOptions): Rgba[] {
  const { steps, minLightness = 0.15, maxLightness = 0.95 } = options;
  if (!Number.isInteger(steps) || steps < 2) {
    throw new PaletteConfigError(`ramp steps must be an integer of at least 2, got ${steps}`);
  }
  if (!(minLightness >= 0 && minLightness <= 1) || !(maxLightness >= 0 && maxLightness <= 1)) {
    throw new PaletteConfigError(
      `ramp lightness bounds must be within [0, 1], got minLightness=${minLightness}, maxLightness=${maxLightness}`,
    );
  }
  if (minLightness > maxLightness) {
    throw new PaletteConfigError(`ramp minLightness (${minLightness}) must not exceed maxLightness (${maxLightness})`);
  }
  const baseLab = srgbToOklab(base);
  const swatches: Rgba[] = [];
  for (let i = 0; i < steps; i += 1) {
    const l = minLightness + ((maxLightness - minLightness) * i) / (steps - 1);
    const lab = { a: baseLab.a, alpha: baseLab.alpha, b: baseLab.b, l };
    swatches.push(oklabToSrgb(fitGamut(lab)));
  }
  return swatches;
}
