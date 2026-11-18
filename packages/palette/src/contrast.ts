import { clamp, linearize } from './convert.js';
import type { ReadableOnOptions, Rgba } from './types.js';

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
