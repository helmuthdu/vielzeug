import { clamp, oklabToOklch, srgbToHsl, srgbToOklab } from './convert.js';
import type { FormatOptions, Rgba } from './types.js';

/** Rounds to `digits` decimals without negative zero. */
function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

function hex2(value: number): string {
  return round(value, 0).toString(16).padStart(2, '0');
}

function shouldWriteAlpha(color: Rgba, options: FormatOptions | undefined): boolean {
  return options?.alpha === true || clamp(color.a, 0, 1) < 1;
}

/** Formats as `#rrggbb` or `#rrggbbaa`. Out-of-gamut channels are clamped to 0–255 and alpha to 0–1. */
export function toHex(color: Rgba, options?: FormatOptions): string {
  const r = hex2(clamp(color.r, 0, 255));
  const g = hex2(clamp(color.g, 0, 255));
  const b = hex2(clamp(color.b, 0, 255));
  return shouldWriteAlpha(color, options) ? `#${r}${g}${b}${hex2(clamp(color.a, 0, 1) * 255)}` : `#${r}${g}${b}`;
}

/** Formats as CSS `rgb()`/`rgba()` space syntax. Out-of-gamut channels are clamped to 0–255 and alpha to 0–1. */
export function toRgbString(color: Rgba, options?: FormatOptions): string {
  const r = round(clamp(color.r, 0, 255), 0);
  const g = round(clamp(color.g, 0, 255), 0);
  const b = round(clamp(color.b, 0, 255), 0);
  if (!shouldWriteAlpha(color, options)) return `rgb(${r} ${g} ${b})`;
  return `rgb(${r} ${g} ${b} / ${round(clamp(color.a, 0, 1), 3)})`;
}

/** Formats as CSS `hsl()`/`hsla()` space syntax. Out-of-gamut channels are clamped before conversion. */
export function toHslString(color: Rgba, options?: FormatOptions): string {
  const hsl = srgbToHsl(color);
  const h = round(hsl.h, 1);
  const s = round(hsl.s, 1);
  const l = round(hsl.l, 1);
  if (!shouldWriteAlpha(color, options)) return `hsl(${h} ${s}% ${l}%)`;
  return `hsl(${h} ${s}% ${l}% / ${round(clamp(color.a, 0, 1), 3)})`;
}

/** Formats as CSS `oklch()` syntax on the color's true (possibly out-of-gamut) channels. */
export function toOklchString(color: Rgba, options?: FormatOptions): string {
  const oklch = oklabToOklch(srgbToOklab(color));
  const l = round(oklch.l * 100, 2);
  const c = round(oklch.c, 4);
  const h = round(oklch.h, 2);
  if (!shouldWriteAlpha(color, options)) return `oklch(${l}% ${c} ${h})`;
  return `oklch(${l}% ${c} ${h} / ${round(clamp(color.a, 0, 1), 3)})`;
}
