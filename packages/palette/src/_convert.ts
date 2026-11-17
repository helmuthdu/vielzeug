import type { Hsla, Oklab, Oklch, Rgba } from './types.js';

/** Clamps to the inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** sRGB companding decode (EOTF): gamma-encoded 0–1 to linear light 0–1. */
export function linearize(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** sRGB companding encode (OETF): linear light 0–1 to gamma-encoded 0–1. */
export function delinearize(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function toLinear255(channel: number): number {
  return linearize(clamp(channel, 0, 255) / 255);
}

/** sRGB (0–255, clamped) to OKLab using Björn Ottosson's matrices via linear-cone LMS. */
export function srgbToOklab(color: Rgba): Oklab {
  const r = toLinear255(color.r);
  const g = toLinear255(color.g);
  const b = toLinear255(color.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    alpha: clamp(color.a, 0, 1),
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
  };
}

/** OKLab to sRGB (0–255, clamped to the displayable range). */
export function oklabToSrgb(color: Oklab): Rgba {
  const l = (color.l + 0.3963377774 * color.a + 0.2158037573 * color.b) ** 3;
  const m = (color.l - 0.1055613458 * color.a - 0.0638541728 * color.b) ** 3;
  const s = (color.l - 0.0894841775 * color.a - 1.291485548 * color.b) ** 3;
  return {
    a: clamp(color.alpha, 0, 1),
    b: clamp(delinearize(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255, 0, 255),
    g: clamp(delinearize(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255, 0, 255),
    r: clamp(delinearize(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255, 0, 255),
  };
}

/** OKLab to OKLCH (polar form of the a/b plane). */
export function oklabToOklch(color: Oklab): Oklch {
  const h = (Math.atan2(color.b, color.a) * 180) / Math.PI;
  return {
    alpha: color.alpha,
    c: Math.hypot(color.a, color.b),
    h: h < 0 ? h + 360 : h,
    l: color.l,
  };
}

/** OKLCH to OKLab. */
export function oklchToOklab(color: Oklch): Oklab {
  const rad = (color.h * Math.PI) / 180;
  return {
    a: color.c * Math.cos(rad),
    alpha: color.alpha,
    b: color.c * Math.sin(rad),
    l: color.l,
  };
}

/** sRGB (0–255, clamped) to HSL. */
export function srgbToHsl(color: Rgba): Hsla {
  const r = clamp(color.r, 0, 255) / 255;
  const g = clamp(color.g, 0, 255) / 255;
  const b = clamp(color.b, 0, 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  return { a: clamp(color.a, 0, 1), h: h < 0 ? h + 360 : h, l: l * 100, s: s * 100 };
}

/** HSL to sRGB (0–255, clamped to the displayable range). */
export function hslToSrgb(color: Hsla): Rgba {
  const h = ((color.h % 360) + 360) % 360;
  const s = color.s / 100;
  const l = color.l / 100;
  const amplitude = s * Math.min(l, 1 - l);
  const channel = (offset: number) => {
    const k = (offset + h / 30) % 12;
    return clamp((l - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255, 0, 255);
  };
  return { a: clamp(color.a, 0, 1), b: channel(4), g: channel(8), r: channel(0) };
}
