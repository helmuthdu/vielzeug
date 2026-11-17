import { clamp, delinearize, linearize, oklabToSrgb, srgbToOklab } from './_convert.js';
import { PaletteConfigError } from './errors.js';
import type { RampOptions, ReadableOnOptions, Rgba } from './types.js';

/** WCAG 2.x relative luminance of a color, computed on channels clamped to 0–255. */
export function relativeLuminance(color: Rgba): number {
  const r = linearize(clamp(color.r, 0, 255) / 255);
  const g = linearize(clamp(color.g, 0, 255) / 255);
  const b = linearize(clamp(color.b, 0, 255) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two colors: 1 (identical) to 21 (black on white). */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Picks the first candidate that reaches the WCAG contrast threshold against
 * `background`: 4.5 (AA) or 7 (AAA) normally, 3 or 4.5 when `large` is true.
 * Returns null when no candidate passes.
 */
export function readableOn(background: Rgba, candidates: readonly Rgba[], options?: ReadableOnOptions): Rgba | null {
  const level = options?.level ?? 'AA';
  const large = options?.large ?? false;
  const threshold = large ? (level === 'AAA' ? 4.5 : 3) : level === 'AAA' ? 7 : 4.5;
  for (const candidate of candidates) {
    if (contrastRatio(background, candidate) >= threshold) return candidate;
  }
  return null;
}

/**
 * Interpolates two colors in linear-light sRGB (convert to linear, lerp,
 * re-encode) with alpha interpolated linearly. `t` is 0 for `a`, 1 for `b`.
 */
export function mix(a: Rgba, b: Rgba, t: number): Rgba {
  if (!Number.isFinite(t) || t < 0 || t > 1) {
    throw new PaletteConfigError(`mix position t must be within [0, 1], got ${t}`);
  }
  const channel = (ca: number, cb: number): number => {
    const la = linearize(clamp(ca, 0, 255) / 255);
    const lb = linearize(clamp(cb, 0, 255) / 255);
    return delinearize(la + (lb - la) * t) * 255;
  };
  return {
    a: clamp(a.a, 0, 1) + (clamp(b.a, 0, 1) - clamp(a.a, 0, 1)) * t,
    b: channel(a.b, b.b),
    g: channel(a.g, b.g),
    r: channel(a.r, b.r),
  };
}

/**
 * Builds a deterministic ramp of `steps` swatches by interpolating OKLab
 * lightness between `minLightness` and `maxLightness` while keeping the base
 * color's hue and chroma. Swatches run dark to light.
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
    // Keep the base hue and chroma; only L varies. Out-of-gamut results clamp on conversion.
    swatches.push(oklabToSrgb({ a: baseLab.a, alpha: baseLab.alpha, b: baseLab.b, l }));
  }
  return swatches;
}
