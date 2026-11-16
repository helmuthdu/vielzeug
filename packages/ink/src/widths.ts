/** Velocity- and pressure-modulated stroke widths. */

import { clamp, distance, requireFiniteNumber, requirePositive, requireStrokePoints } from './_validate.js';
import { InkConfigError } from './errors.js';
import type { StrokePoint } from './types.js';

export interface StrokeWidthOptions {
  /** Width at reference speed with neutral pressure. Must be positive. */
  baseWidth: number;
  /** Upper clamp for the velocity scale factor. Default `2`. */
  maxScale?: number;
  /** Lower clamp for the velocity scale factor. Default `0.25`. */
  minScale?: number;
  /** Spacing per sample treated as "neutral" speed. Default `4`. */
  referenceSpeed?: number;
  /** How strongly speed modulates width: `0` disables velocity, `1` is fully inverse-proportional. Default `0.5`. */
  velocityExponent?: number;
}

export interface ResolvedWidthOptions {
  baseWidth: number;
  maxScale: number;
  minScale: number;
  referenceSpeed: number;
  velocityExponent: number;
}

/** Validate and resolve width options. Shared with `strokeOutline`. @internal */
export function resolveWidthOptions(options: StrokeWidthOptions): ResolvedWidthOptions {
  const baseWidth = requirePositive(options.baseWidth, 'baseWidth');
  const velocityExponent = requireFiniteNumber(options.velocityExponent ?? 0.5, 'velocityExponent');
  const minScale = requirePositive(options.minScale ?? 0.25, 'minScale');
  const maxScale = requirePositive(options.maxScale ?? 2, 'maxScale');
  const referenceSpeed = requirePositive(options.referenceSpeed ?? 4, 'referenceSpeed');
  if (velocityExponent < 0) {
    throw new InkConfigError(`Expected velocityExponent to be >= 0, received ${velocityExponent}.`);
  }
  if (minScale > maxScale) {
    throw new InkConfigError(`Expected minScale (${minScale}) to be <= maxScale (${maxScale}).`);
  }
  return { baseWidth, maxScale, minScale, referenceSpeed, velocityExponent };
}

/** Pressure response curve: gentle around neutral pressure, stronger near the extremes. */
function pressureScale(pressure: number | undefined): number {
  // 0.5 is treated as neutral pen pressure; the curve stays within [0.5, 1.25].
  if (pressure === undefined) return 1;
  const p = clamp(pressure, 0, 1);
  return 0.5 + p * p * 0.75;
}

/**
 * Compute one width per stroke point from spacing-derived speed and optional pressure.
 *
 * Timestamps are not part of `StrokePoint`, so the distance to the previous sample is the speed
 * proxy: wider when slow, narrower when fast, scaled by `velocityExponent` and clamped to
 * `[minScale, maxScale]`. When a point carries `pressure`, it multiplies the result.
 * The first point uses the second segment's spacing; degenerate (zero-length) segments keep the
 * previous scale so stationary samples do not spike.
 *
 * @throws {import('./errors.js').InkConfigError} When `points` is invalid or options are out of range.
 */
export function strokeWidths(points: readonly StrokePoint[], options: StrokeWidthOptions): number[] {
  const input = requireStrokePoints(points, 1);
  const { baseWidth, velocityExponent, minScale, maxScale, referenceSpeed } = resolveWidthOptions(options);
  const widths: number[] = [];
  let lastScale = 1;
  for (let i = 0; i < input.length; i++) {
    const point = input[i];
    // Speed proxy: spacing to the previous sample, or the forward spacing for the first point.
    const spacing =
      i > 0
        ? distance(input[i - 1].x, input[i - 1].y, point.x, point.y)
        : input.length > 1
          ? distance(point.x, point.y, input[1].x, input[1].y)
          : referenceSpeed;
    if (spacing > 0) {
      // Slow (small spacing) widens: width scales with (referenceSpeed / spacing) ^ exponent.
      lastScale = clamp((referenceSpeed / spacing) ** velocityExponent, minScale, maxScale);
    }
    widths.push(baseWidth * lastScale * pressureScale(point.pressure));
  }
  return widths;
}
