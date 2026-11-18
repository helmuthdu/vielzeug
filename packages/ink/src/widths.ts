/** Velocity- and pressure-modulated stroke widths. */

import { clamp, distance, requirePositive, requireRange, requireStrokePoints } from './_validate.js';
import type { StrokePoint } from './types.js';

export interface StrokeWidthOptions {
  /** Pen speed treated as "neutral", in pixels per millisecond. Default `0.5`. */
  referenceSpeed?: number;
  /** How strongly speed modulates width: `0` disables velocity, `1` is fully inverse-proportional. Default `0.5`. */
  thinning?: number;
  /** Width at reference speed with neutral pressure. Must be positive. */
  width: number;
}

/** Fixed velocity-scale range; slow strokes at most double, fast strokes at most quarter. */
const MIN_SCALE = 0.25;
const MAX_SCALE = 2;

/**
 * Pressure response curve, clamped to `[0, 1]`:
 * `0.5` (the neutral value a mouse reports) maps to exactly `1`, so a stroke with
 * neutral pressure is as wide as one without pressure data. Range: `[0.5, 1.25]`.
 */
function pressureScale(pressure: number): number {
  const p = clamp(pressure, 0, 1);
  return p <= 0.5 ? 0.5 + p : 1 + (p - 0.5) * 0.5;
}

/**
 * Compute one width per stroke point from pen speed and optional pressure.
 *
 * Speed is `distance / Δtime` between consecutive points, which stays correct after any
 * smoothing, stabilization, or simplification — the pipeline order no longer matters. When any
 * point lacks `time`, or a Δtime is zero, velocity modulation is disabled for the whole stroke
 * (width becomes `width × pressure`) instead of falling back to a spacing proxy that resampling
 * would distort. Slow widens, fast narrows, clamped to a fixed `[0.25, 2]` scale.
 *
 * The first point uses the forward segment; degenerate (zero-length) segments keep the previous
 * scale so stationary samples do not spike.
 *
 * @throws {import('./errors.js').InkConfigError} When options are out of range or `points` is empty.
 */
export function strokeWidths(points: readonly StrokePoint[], options: StrokeWidthOptions): number[] {
  const input = requireStrokePoints(points, 1);
  const width = requirePositive(options.width, 'width');
  const thinning = requireRange(options.thinning ?? 0.5, 'thinning', 0, 1);
  const referenceSpeed = requirePositive(options.referenceSpeed ?? 0.5, 'referenceSpeed');

  // Velocity needs a timestamp on every point; otherwise it is off for the whole stroke.
  const timed = input.every((point) => point.time !== undefined);

  const widths: number[] = [];
  let lastScale = 1;
  for (let i = 0; i < input.length; i++) {
    if (timed && thinning > 0) {
      const point = input[i];
      const next = input[i + 1];
      // First point looks forward; the rest look at the segment they arrived on.
      const from = i > 0 ? input[i - 1] : point;
      const to = i > 0 ? point : next;
      if (to) {
        const dt = Math.abs((to.time as number) - (from.time as number));
        if (dt > 0) {
          const speed = distance(from.x, from.y, to.x, to.y) / dt;
          // Slow (speed < reference) widens: scale = (referenceSpeed / speed) ^ thinning.
          lastScale = clamp((referenceSpeed / speed) ** thinning, MIN_SCALE, MAX_SCALE);
        }
      }
    }
    const pressure = input[i].pressure;
    widths.push(width * lastScale * (pressure === undefined ? 1 : pressureScale(pressure)));
  }
  return widths;
}
